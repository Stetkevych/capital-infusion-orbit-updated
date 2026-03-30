const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require('@aws-sdk/client-athena');

const athena = new AthenaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const DATABASE = 'capital_infusion_analytics';
const WORKGROUP = 'capital-infusion-analytics';
const OUTPUT = `s3://${process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216'}/athena-results/`;

async function runQuery(sql) {
  const start = await athena.send(new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: DATABASE },
    WorkGroup: WORKGROUP,
    ResultConfiguration: { OutputLocation: OUTPUT },
  }));

  const execId = start.QueryExecutionId;

  // Poll until complete
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: execId }));
    const state = status.QueryExecution.Status.State;
    if (state === 'SUCCEEDED') break;
    if (state === 'FAILED' || state === 'CANCELLED') {
      throw new Error(`Athena query ${state}: ${status.QueryExecution.Status.StateChangeReason}`);
    }
  }

  const results = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: execId }));
  return parseResults(results);
}

function parseResults(results) {
  const rows = results.ResultSet.Rows;
  if (rows.length < 2) return [];
  const headers = rows[0].Data.map(d => d.VarCharValue);
  return rows.slice(1).map(row => {
    const obj = {};
    row.Data.forEach((cell, i) => {
      const val = cell.VarCharValue;
      obj[headers[i]] = isNaN(val) || val === '' ? val : Number(val);
    });
    return obj;
  });
}

module.exports = { runQuery };
