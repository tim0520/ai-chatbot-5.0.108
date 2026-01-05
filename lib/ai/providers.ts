import { gateway } from "@ai-sdk/gateway";
import { deepseek } from "@ai-sdk/deepseek";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

const getModelProvider = (modelId: string) => {
  if (modelId.startsWith("deepseek/")) {
    return deepseek(modelId.replace("deepseek/", ""));
  }
  
  // 默认回退 (Fallback) 到 DeepSeek
  return deepseek("deepseek-chat");
};

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

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  const baseModel = getModelProvider(
    isReasoningModel ? modelId.replace(THINKING_SUFFIX_REGEX, "") : modelId
  );  
  if (isReasoningModel) {
    //const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: baseModel as any,
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return baseModel;//gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return deepseek("deepseek-chat");//gateway.languageModel("anthropic/claude-haiku-4.5");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return deepseek("deepseek-chat");//gateway.languageModel("anthropic/claude-haiku-4.5");
}
