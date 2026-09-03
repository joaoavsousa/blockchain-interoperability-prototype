"use strict";

const BASE_URL =
  "http://localhost:3000";

const RUNS = 10;

function median(values) {
  const sorted =
    [...values].sort(
      (a, b) => a - b,
    );

  const middle =
    Math.floor(
      sorted.length / 2,
    );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      sorted[middle - 1] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}

function mean(values) {
  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  );
}

function standardDeviation(values) {
  const avg =
    mean(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        Math.pow(
          value - avg,
          2,
        ),
      0,
    ) / values.length;

  return Math.sqrt(
    variance,
  );
}

function summarize(values) {
  return {
    mean:
      mean(values),

    median:
      median(values),

    min:
      Math.min(
        ...values,
      ),

    max:
      Math.max(
        ...values,
      ),

    stdDev:
      standardDeviation(
        values,
      ),
  };
}

async function postJson(
  endpoint,
  body,
) {
  const response =
    await fetch(
      `${BASE_URL}${endpoint}`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            body,
          ),
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data.success === false
  ) {
    throw new Error(
      `${endpoint} failed: ${
        data.error ??
        response.statusText
      }`,
    );
  }

  return data;
}

async function createAsset(
  assetId,
) {
  return postJson(
    "/api/assets",
    {
      assetId:
        String(assetId),

      productName:
        `Performance Product ${assetId}`,

      serialNumber:
        `PERF-SN-${assetId}`,

      batchNumber:
        `PERF-BATCH-${assetId}`,

      productionDate:
        "2026-08-24",

      origin:
        "Portugal",

      manufacturerId:
        "performance-manufacturer",

      manufacturerName:
        "Performance Manufacturer",

      ownerId:
        "performance-manufacturer",

      ownerName:
        "Performance Manufacturer",

      metadataUri:
        `https://example.org/dpp/PERF-${assetId}.json`,

      notes:
        `T06 performance asset ${assetId}`,

      initialAmount:
        1,
    },
  );
}

async function transferAsset(
  assetId,
) {
  return postJson(
    "/api/transfers",
    {
      assetId:
        String(assetId),

      amount:
        1,

      notes:
        `T06 performance run for asset ${assetId}`,
    },
  );
}

async function main() {
  const results = [];

  console.log(
    `Starting ${RUNS} performance runs...\n`,
  );

  for (
    let i = 0;
    i < RUNS;
    i++
  ) {
    const assetId =
      3001 + i;

    console.log(
      `Run ${i + 1}/${RUNS}`,
    );

    console.log(
      `Creating asset ${assetId}...`,
    );

    await createAsset(
      assetId,
    );

    console.log(
      `Transferring asset ${assetId}...`,
    );

    const transferResult =
      await transferAsset(
        assetId,
      );

    const performance =
      transferResult.performance;

    if (!performance) {
      throw new Error(
        "Transfer response did not contain performance metrics.",
      );
    }

    const row = {
      run:
        i + 1,

      assetId,

      transferId:
        transferResult.transferId,

      sourceToRelayMs:
        Number(
          performance
            .sourceToRelayMs,
        ),

      relayToDestinationMs:
        Number(
          performance
            .relayToDestinationMs,
        ),

      totalMs:
        Number(
          performance.totalMs,
        ),
    };

    results.push(
      row,
    );

    console.log(
      `Source -> Relay: ${row.sourceToRelayMs.toFixed(2)} ms`,
    );

    console.log(
      `Relay -> Destination: ${row.relayToDestinationMs.toFixed(2)} ms`,
    );

    console.log(
      `Total: ${row.totalMs.toFixed(2)} ms\n`,
    );
  }

  console.log(
    "\n========================================",
  );

  console.log(
    "T06 PERFORMANCE RESULTS",
  );

  console.log(
    "========================================\n",
  );

  console.table(
    results.map(
      (row) => ({
        Run:
          row.run,

        Asset:
          row.assetId,

        "Source -> Relay (ms)":
          Number(
            row
              .sourceToRelayMs
              .toFixed(2),
          ),

        "Relay -> Destination (ms)":
          Number(
            row
              .relayToDestinationMs
              .toFixed(2),
          ),

        "Total (ms)":
          Number(
            row
              .totalMs
              .toFixed(2),
          ),
      }),
    ),
  );

  const sourceStats =
    summarize(
      results.map(
        (row) =>
          row.sourceToRelayMs,
      ),
    );

  const destinationStats =
    summarize(
      results.map(
        (row) =>
          row.relayToDestinationMs,
      ),
    );

  const totalStats =
    summarize(
      results.map(
        (row) =>
          row.totalMs,
      ),
    );

  const summary = [
    {
      Metric:
        "Source -> Relay",
      Mean:
        sourceStats.mean,
      Median:
        sourceStats.median,
      Min:
        sourceStats.min,
      Max:
        sourceStats.max,
      "Std Dev":
        sourceStats.stdDev,
    },

    {
      Metric:
        "Relay -> Destination",
      Mean:
        destinationStats.mean,
      Median:
        destinationStats.median,
      Min:
        destinationStats.min,
      Max:
        destinationStats.max,
      "Std Dev":
        destinationStats.stdDev,
    },

    {
      Metric:
        "Total",
      Mean:
        totalStats.mean,
      Median:
        totalStats.median,
      Min:
        totalStats.min,
      Max:
        totalStats.max,
      "Std Dev":
        totalStats.stdDev,
    },
  ];

  console.log(
    "\nSummary statistics:\n",
  );

  console.table(
    summary.map(
      (row) => ({
        Metric:
          row.Metric,

        "Mean (ms)":
          Number(
            row.Mean.toFixed(
              2,
            ),
          ),

        "Median (ms)":
          Number(
            row.Median.toFixed(
              2,
            ),
          ),

        "Min (ms)":
          Number(
            row.Min.toFixed(
              2,
            ),
          ),

        "Max (ms)":
          Number(
            row.Max.toFixed(
              2,
            ),
          ),

        "Std Dev (ms)":
          Number(
            row[
              "Std Dev"
            ].toFixed(
              2,
            ),
          ),
      }),
    ),
  );

  console.log(
    "\nT06 completed successfully.",
  );
}

main().catch(
  (error) => {
    console.error(
      "\nT06 FAILED:",
      error.message,
    );

    process.exit(1);
  },
);
