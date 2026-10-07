import { aiService } from './src/services/aiService.server';

async function test() {
  const res = await aiService.getEnhancedPrompt('điều kiện lấy học bổng');
  console.log("=== PROMPT ===");
  console.log(res.systemPrompt);
  console.log("=== HAS KNOWLEDGE ===", res.hasKnowledge);
  console.log("=== LAYER ===", res.layer);
}
test();
