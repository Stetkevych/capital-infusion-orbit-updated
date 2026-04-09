const mindee = require('mindee');

const client = new mindee.Client({ apiKey: 'md_QHXO8ETx889TsZFE6Imi_FvB-s21JbWyGcmu1O9TD5c' });
const input = new mindee.PathInput({ inputPath: './test-sample.pdf' });

(async () => {
  try {
    const response = await client.enqueueAndGetResult(
      mindee.product.Ocr,
      input,
      { modelId: '52dc192e-8592-415d-aac5-5404d1e9080e' },
    );
    const pages = response.inference.result.pages;
    const page = pages[0];
    const words = page.words || [];
    console.log(`Words: ${words.length}`);
    // Show first 5 word objects fully
    words.slice(0, 5).forEach((w, i) => console.log(`Word ${i}:`, JSON.stringify(w)));
    // Reconstruct lines from words
    const allText = words.map(w => w.text).filter(Boolean).join(' ');
    console.log('\nAll text (first 2000 chars):');
    console.log(allText.slice(0, 2000));
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
