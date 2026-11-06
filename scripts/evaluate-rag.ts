import { dbService } from '@/lib/db.server';
import { aiService } from '../src/services/aiService.server';

export interface EvaluationTestCase {
  id: string;
  category: string;
  query: string;
  expectedKeywordInTopCitations: string[];
  expectedLayer: 'HYBRID' | 'CHITCHAT' | 'FALLBACK';
}

export const BENCHMARK_TEST_SUITE: EvaluationTestCase[] = [
  {
    id: 'TC_01',
    category: 'Đào tạo - Tín chỉ & Điểm F',
    query: 'sinh viên bị điểm F thì đăng ký học cải thiện như thế nào?',
    expectedKeywordInTopCitations: ['580', 'đào tạo', 'tín chỉ', 'học phần'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_02',
    category: 'Đào tạo - Khối lượng học tập',
    query: 'khối lượng học tập tối thiểu một học kỳ chính là bao nhiêu tín chỉ?',
    expectedKeywordInTopCitations: ['580', 'học phần', 'tín chỉ', 'khối lượng'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_03',
    category: 'CTHSSV - Miễn giảm học phí',
    query: 'hồ sơ thủ tục miễn giảm học phí cho sinh viên thuộc hộ nghèo gồm những gì?',
    expectedKeywordInTopCitations: ['miễn giảm', 'học phí', 'hộ nghèo', 'chính sách'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_04',
    category: 'CTHSSV - Thẻ sinh viên',
    query: 'làm mất thẻ sinh viên thì phải liên hệ làm lại ở đâu?',
    expectedKeywordInTopCitations: ['thẻ sinh viên', 'cấp phát', '1146', 'hồ sơ'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_05',
    category: 'Khảo thí - Hoãn thi',
    query: 'thủ tục xin hoãn thi hoặc vắng thi kết thúc học phần',
    expectedKeywordInTopCitations: ['khảo thí', 'hoãn thi', 'vắng thi', 'điểm'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_06',
    category: 'CSVC - Ký túc xá',
    query: 'sinh viên năm nhất có được đăng ký ở ký túc xá không?',
    expectedKeywordInTopCitations: ['ký túc xá', 'nội trú', 'phòng ở'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_07',
    category: 'Hành chính - Giấy tờ',
    query: 'xin giấy xác nhận sinh viên hoặc công văn hành chính ở phòng nào?',
    expectedKeywordInTopCitations: ['hành chính', 'văn thư', 'xác nhận'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_08',
    category: 'Tài chính - Thu học phí',
    query: 'thời hạn nộp học phí và cách thức đóng tiền học qua ngân hàng',
    expectedKeywordInTopCitations: ['học phí', 'kế hoạch', 'tài chính', 'thu'],
    expectedLayer: 'HYBRID',
  },
  {
    id: 'TC_09',
    category: 'Chitchat - Giao tiếp cơ bản',
    query: 'chào bạn, bạn là ai thế?',
    expectedKeywordInTopCitations: [],
    expectedLayer: 'CHITCHAT',
  },
  {
    id: 'TC_10',
    category: 'Out of domain - Ngoài phạm vi',
    query: 'quán trà sữa nào ngon nhất gần trường CNTT?',
    expectedKeywordInTopCitations: [],
    expectedLayer: 'FALLBACK',
  },
];

async function runBenchmark() {
  console.log('======================================================================');
  console.log('       iBot HYBRID RAG SYSTEM AUTOMATED BENCHMARK (PHASE 7)           ');
  console.log('======================================================================\n');

  let passedHits = 0;
  let totalReciprocalRank = 0;
  let totalLatency = 0;

  console.log(`Running evaluation across ${BENCHMARK_TEST_SUITE.length} standard test cases...\n`);

  for (let i = 0; i < BENCHMARK_TEST_SUITE.length; i++) {
    const tc = BENCHMARK_TEST_SUITE[i];
    const start = Date.now();
    const result = await aiService.getEnhancedPrompt(tc.query);
    const latency = Date.now() - start;
    totalLatency += latency;

    // Check layer accuracy
    const layerCorrect = result.layer === tc.expectedLayer;

    // Check retrieval hit
    let hitFound = false;
    let rankOfFirstHit = 0;

    if (tc.expectedKeywordInTopCitations.length === 0) {
      hitFound = layerCorrect;
      if (hitFound) rankOfFirstHit = 1;
    } else if (result.citations && result.citations.length > 0) {
      for (let cIdx = 0; cIdx < result.citations.length; cIdx++) {
        const c = result.citations[cIdx];
        const citationHaystack = `${c.title} ${c.department} ${c.sourceRef || ''} ${c.snippet}`.toLowerCase();
        const matchesAny = tc.expectedKeywordInTopCitations.some((kw) => citationHaystack.includes(kw.toLowerCase()));
        if (matchesAny) {
          hitFound = true;
          rankOfFirstHit = cIdx + 1;
          break;
        }
      }
    }

    if (hitFound) {
      passedHits++;
      totalReciprocalRank += 1 / rankOfFirstHit;
    }

    const statusIcon = hitFound && layerCorrect ? '✅ PASS' : '⚠️ REVIEW';
    console.log(`[${tc.id}] ${statusIcon} | Latency: ${latency}ms | Layer: ${result.layer}`);
    console.log(`     Query: "${tc.query}"`);
    if (result.citations && result.citations.length > 0) {
      console.log(`     Top Citation: ${result.citations[0].title} (${result.citations[0].department})`);
    }
    console.log();
  }

  const hitRate = (passedHits / BENCHMARK_TEST_SUITE.length) * 100;
  const mrr = totalReciprocalRank / BENCHMARK_TEST_SUITE.length;
  const avgLatency = Math.round(totalLatency / BENCHMARK_TEST_SUITE.length);

  console.log('======================================================================');
  console.log('                     FINAL EVALUATION METRICS                         ');
  console.log('======================================================================');
  console.log(`• Overall Hit Rate@K : ${hitRate.toFixed(1)}% (Target: >= 85%)`);
  console.log(`• Mean Reciprocal Rank (MRR) : ${mrr.toFixed(3)} (Target: >= 0.750)`);
  console.log(`• Average Processing Latency : ${avgLatency}ms (Target: < 350ms)`);
  console.log(`• Total Knowledge Base Items : Chunks + FAQs active in database`);
  console.log('======================================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

