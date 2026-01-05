import { gateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

// 定义一个通用的 Fetch Patch 函数 (用于修复 openai o1版本后 developer 角色报错)
const patchFetchRole = async (url: any, options: any) => {
  if (options && options.body && typeof options.body === 'string') {
    // 很多国产大模型都不支持 "developer" 角色，强制替换为 "system"
    if (options.body.includes('"role":"developer"')) {
      options.body = options.body.replace(/"role":"developer"/g, '"role":"system"');
    }
  }
  return fetch(url, options);
};

// ---------------------------------------------------------
// 1. 初始化 DeepSeek (直连)
// ---------------------------------------------------------
const deepseek = createOpenAI({
  name: 'deepseek',
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  fetch: patchFetchRole, // 使用通用补丁
});

// ---------------------------------------------------------
// 2. ✅ 新增: 初始化 Qwen (通义千问 - 阿里云直连)
// ---------------------------------------------------------
const qwen = createOpenAI({
  name: 'qwen',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', 
  apiKey: process.env.QWEN_API_KEY ?? '',
  fetch: patchFetchRole, 
});

// Mock Provider (测试环境用)
export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

// 核心路由逻辑
export function getLanguageModel(modelId: string) {
  // A. 测试环境拦截
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // B. DeepSeek 路由
  if (modelId.startsWith("deepseek/")) {
    const cleanId = modelId.replace("deepseek/", "");
    return deepseek.chat(cleanId);
  }

  // C.Qwen 路由
  if (modelId.startsWith("qwen/")) {
    const cleanId = modelId.replace("qwen/", "");
    return qwen.chat(cleanId);
  }

  // D. 官方原有逻辑 (走 Vercel AI Gateway)
  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return gateway.languageModel(modelId);
}

// 辅助模型 (你可以按需改成 qwen)
export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  // 用 DeepSeek 生成标题比较便宜且快 deepseek.chat("deepseek-chat")，当然你也可以改成 qwen.chat("qwen-turbo")
  return qwen.chat("qwen-plus");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return qwen.chat("qwen-plus");
}