import type { RetrievalResult, ChunkItem, FAQItem } from './types';

export interface CitationInfo {
  index: number;
  id: string;
  title: string;
  docId?: string;
  department: string;
  sourceRef?: string;
  sourceType: 'chunk' | 'faq';
  snippet: string;
}

export interface BuiltContext {
  formattedContext: string;
  citations: CitationInfo[];
  totalContextTokens: number;
  hasHighConfidenceMatch: boolean;
}

export function buildGroundedContext(
  retrievalResults: RetrievalResult<ChunkItem | FAQItem>[],
  maxTokens = 2200
): BuiltContext {
  const citations: CitationInfo[] = [];
  const contextBlocks: string[] = [];
  let tokenAcc = 0;
  let hasHighConfidence = false;

  for (let idx = 0; idx < retrievalResults.length; idx++) {
    const res = retrievalResults[idx];
    if (res.score >= 0.7) {
      hasHighConfidence = true;
    }

    if ('fileName' in res.item) {
      // It's a ChunkItem
      const chunk = res.item;
      const title = chunk.metadata.doc_title || chunk.fileName;
      const docId = chunk.metadata.doc_id;
      const dept = chunk.metadata.department_name_vi || chunk.metadata.department || chunk.folder;
      const source = chunk.metadata.source;

      const citation: CitationInfo = {
        index: idx + 1,
        id: chunk.id,
        title,
        docId,
        department: dept,
        sourceRef: source,
        sourceType: 'chunk',
        snippet: chunk.cleanContent.slice(0, 150).replace(/\s+/g, ' '),
      };
      citations.push(citation);

      const block = `[TRÍCH DẪN ${idx + 1}]
- Văn bản: ${title}${docId ? ` (Số hiệu: ${docId})` : ''}
- Đơn vị: ${dept}${source ? ` - Trích đoạn: ${source}` : ''}
- Nội dung trích xuất:
${chunk.cleanContent}`;

      const estTokens = Math.ceil(block.length / 3.8);
      if (tokenAcc + estTokens > maxTokens && contextBlocks.length > 0) {
        break; // Stop adding if token budget exceeded
      }

      tokenAcc += estTokens;
      contextBlocks.push(block);
    } else if ('question' in res.item) {
      // It's a FAQItem
      const faq = res.item;
      const citation: CitationInfo = {
        index: idx + 1,
        id: `faq_${faq.id}`,
        title: faq.question,
        department: 'Hỏi đáp chung (FAQ)',
        sourceType: 'faq',
        snippet: faq.answer.slice(0, 150).replace(/\s+/g, ' '),
      };
      citations.push(citation);

      const block = `[CÂU HỎI & ĐÁP ÁN CHUẨN ${idx + 1}]
- Câu hỏi thường gặp: ${faq.question}
- Đáp án chính thức:
${faq.answer}`;

      const estTokens = Math.ceil(block.length / 3.8);
      if (tokenAcc + estTokens > maxTokens && contextBlocks.length > 0) {
        break;
      }

      tokenAcc += estTokens;
      contextBlocks.push(block);
    }
  }

  const formattedContext = contextBlocks.length > 0
    ? contextBlocks.join('\n\n---\n\n')
    : 'Không tìm thấy tài liệu quy chế hoặc câu hỏi thường gặp phù hợp.';

  return {
    formattedContext,
    citations,
    totalContextTokens: tokenAcc,
    hasHighConfidenceMatch: hasHighConfidence,
  };
}

