const express = require("express");
const path = require("path");

const {
  CrossChainTransferService,
} = require("./services/CrossChainTransferService");

const app = express();
const PORT = 3000;

const transferService =
    new CrossChainTransferService();

// Parse JSON request bodies
app.use(express.json());

// Parse traditional HTML form bodies
app.use(express.urlencoded({ extended: true }));

// Serve files from public/
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Cross-Chain Coordinator is running",
    });
});

// Temporary transfer endpoint
app.post("/api/transfers", async (req, res) => {
    try {

        const result =
            await transferService.executeTransfer(req.body);

        res.json({
            success: true,
            message: "Transfer completed successfully.",
            ...result,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message,
        });

    }
});


//Dashboard endpoint
app.get(
  "/api/assets",
  async (req, res) => {
    try {
      const assets =
        await transferService
          .getAllDigitalProductPassports();

      return res.json({
        success: true,
        assets,
      });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          success: false,
          error:
            error.message,
        });
    }
  },
);



// Monitor a transfer
app.get(
    "/api/transfers/:transferId",
    async (req, res) => {

        try {

            const result =
                await transferService.getTransfer(
                    req.params.transferId,
                );

            res.json({
                success: true,
                transfer: result,
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message,
            });

        }

    },
);

//Asset Creation endpoint
app.post(
  "/api/assets",
  async (req, res) => {
    try {
      const result =
        await transferService
          .createAsset(
            req.body,
          );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Asset and Digital Product Passport created successfully.",
          asset: result,
        });
    } catch (error) {
      console.error(
        "Asset creation failed:",
        error,
      );

      const statusCode =
        error.message
          .includes("already exists")
          ? 409
          : 400;

      return res
        .status(statusCode)
        .json({
          success: false,
          error:
            error.message,
        });
    }
  },
);

//DPP v1
app.get(
  "/api/assets/:assetId",
  async (req, res) => {
    try {
      const result =
        await transferService
          .getDigitalProductPassport(
            req.params.assetId,
          );

      return res.json({
        success: true,
        asset: result,
      });
    } catch (error) {
      console.error(
        "DPP lookup failed:",
        error,
      );

      const statusCode =
        error.message.includes(
          "No DPP was found",
        )
          ? 404
          : 400;

      return res
        .status(statusCode)
        .json({
          success: false,
          error:
            error.message,
        });
    }
  },
);


// Handle unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        error: "API endpoint not found",
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

