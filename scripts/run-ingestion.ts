import { runIngestionPipeline } from '../src/services/rag/ingestion/ingestionService.server';

async function main() {
  console.log('=== RUNNING INGESTION PIPELINE (PHASE 1) ===');
  const startTime = Date.now();
  
  const { stats, chunks } = await runIngestionPipeline();
  const elapsed = Date.now() - startTime;

  console.log('\n--- INGESTION REPORT ---');
  console.log(`Total scanned files: ${stats.scannedFiles}`);
  console.log(`Generated templates for empty departments: ${stats.generatedTemplates}`);
  console.log(`Total parsed chunks: ${stats.totalChunks}`);
  console.log(`Total tokens estimated: ${stats.totalTokens.toLocaleString()}`);
  console.log(`Elapsed time: ${elapsed}ms\n`);

  console.log('--- BREAKDOWN BY DEPARTMENT ---');
  for (const [dept, info] of Object.entries(stats.byDepartment)) {
    console.log(`• ${dept}: ${info.chunks} chunks (${info.tokens.toLocaleString()} tokens) across ${info.files} files`);
  }

  console.log('\nSample synced chunk in memory/DB:');
  const sample = chunks[0];
  console.log({
    id: sample.id,
    title: sample.metadata.doc_title,
    dept: sample.metadata.department_name_vi,
    tokenCount: sample.tokenCount,
    checksum: sample.checksum,
  });
  console.log('\n>>> PHASE 1 COMPLETED SUCCESSFULLY! <<<');
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});

