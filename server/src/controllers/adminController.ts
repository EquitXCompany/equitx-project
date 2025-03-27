import { RequestHandler } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import simpleGit from "simple-git";
import { assetConfig } from "../config/AssetConfig";
import { spawnSync } from "child_process";
import { getLatestPriceData, SERVER_KEYPAIR } from "../utils/serverContractHelpers";
import { AssetService } from "../services/assetService";
import { Asset } from "../entity/Asset";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { LiquidityPool } from "../entity/LiquidityPool";

interface DeployAssetRequest {
  symbol: string;
  name: string;
  feedAddress: string;
  decimals: number;
  minCollateralRatio: number;
  annualInterestRate: number;
}

const determineRepoRoot = () => {
  // Start from the current working directory
  let currentDir = process.cwd();

  // Check if we're in the Docker container (where server code is at /app/server)
  if (currentDir === "/app/server") {
    return "/app";
  }

  // For local development, find the git root by traversing up
  // We know we're in the server directory, so we go one level up
  return path.resolve(currentDir, "..");
};

const findPrebuiltContractsPath = (filename: string) => {
  // Check multiple possible locations for the prebuilt contracts
  const possiblePaths = [
    // Docker path
    path.join(process.cwd(), "prebuilt_contracts", filename),
    // Local development path relative to dist
    path.join(__dirname, "../../prebuilt_contracts", filename),
    // Local development path relative to src
    path.join(process.cwd(), "../prebuilt_contracts", filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found prebuilt contract at: ${p}`);
      return p;
    }
  }

  throw new Error(
    `Pre-built WASM file ${filename} not found. Checked paths: ${possiblePaths.join(", ")}`
  );
};

// const commitAndPushChanges = async (symbol: string) => {
//   try {
//     // Get the repo root that works in both Docker and local development
//     const repoRoot = determineRepoRoot();

//     // Create SSH directory under the server directory
//     const sshDir = path.join(
//       process.cwd(), // This will be the server directory in both envs
//       ".ssh-" + Math.random().toString(36).substring(2, 10)
//     );

//     fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });

//     // Write the SSH key to a file
//     const keyPath = path.join(sshDir, "id_ed25519");

//     // Ensure the key has proper format with headers if they're missing
//     let sshKey = process.env.GITHUB_SSH_KEY || "";
//     // Check if the key contains literal \n characters but not actual newlines
//     // This would be the case if someone manually typed \n in the .env file
//     if (sshKey.includes("\\n") && !sshKey.includes("\n-----")) {
//       sshKey = sshKey.replace(/\\n/g, "\n");
//     }

//     if (!sshKey.includes("-----BEGIN") && !sshKey.includes("-----END")) {
//       // For OpenSSH format
//       sshKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${sshKey}\n-----END OPENSSH PRIVATE KEY-----`;
//     }
//     // Ensure there's a trailing newline
//     if (!sshKey.endsWith("\n")) {
//       sshKey += "\n";
//     }

//     fs.writeFileSync(keyPath, sshKey, { mode: 0o600 });

//     // Write known hosts
//     const knownHostsPath = path.join(sshDir, "known_hosts");
//     const githubKnownHosts =
//       process.env.GITHUB_KNOWN_HOSTS ||
//       "github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==";

//     fs.writeFileSync(knownHostsPath, githubKnownHosts, { mode: 0o600 });

//     const git = simpleGit({
//       baseDir: repoRoot,
//     });
//     // Set environment variables for SSH
//     git.env({
//       GIT_SSH_COMMAND: `ssh -i ${keyPath} -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=${knownHostsPath} -o User=git -v`,
//     });

//     await git.addConfig("user.name", "EquitX Deployment");
//     await git.addConfig("user.email", "equitx-bot@users.noreply.github.com");

//     // Ensure remote uses the correct SSH format
//     const remotes = await git.getRemotes(true);
//     const originUrl = remotes.find((r) => r.name === "origin")?.refs.fetch;
//     if (originUrl) {
//       if (!originUrl.startsWith("git@")) {
//         const repoPath = originUrl.includes("github.com/")
//           ? originUrl.split("github.com/")[1]
//           : originUrl.split("/").slice(-2).join("/").replace(".git", "") +
//           ".git";
//         await git.remote(["set-url", "origin", `git@github.com:${repoPath}`]);
//       }
//     }

//     await git.cwd(repoRoot).checkIsRepo();

//     const status = await git.status();

//     if (status.modified.length === 0 && status.not_added.length === 0) {
//       console.log("No changes to commit");
//       return;
//     }

//     const configFiles = [
//       "server/src/config/AssetConfig.ts",
//       "src/contracts/contractConfig.ts",
//       "src/contracts/util.ts",
//       "environments.toml",
//     ];

//     await git.add(configFiles);

//     const commitMessage = `feat: add ${symbol} asset configuration`;
//     const commitResult = await git.commit(commitMessage);
//     console.log(`Changes committed: ${commitResult.commit}`);

//     await git.push("origin", "main");
//     console.log(`Successfully pushed ${symbol} config changes to GitHub`);

//     // Improved cleanup to ensure all temporary files are removed
//     try {
//       fs.rmSync(sshDir, { recursive: true, force: true });
//       console.log("Successfully cleaned up temporary SSH directory");
//     } catch (err) {
//       console.warn("Failed to clean up temporary SSH files:", err);
//     }
//   } catch (error) {
//     console.error("Error in Git operations:", error);
//     if (error instanceof Error) {
//       throw new Error(`Failed to update GitHub: ${error.message}`);
//     } else {
//       throw new Error("Failed to update GitHub: Unknown error");
//     }
//   }
// };

// Deploy a new asset and update configs
export const deployAsset: RequestHandler = async (req, res) => {
  const assetService = await AssetService.create();
  const liquidityPoolService = await LiquidityPoolService.create();

  try {
    const {
      symbol,
      name,
      decimals,
      minCollateralRatio,
      annualInterestRate,
      feedAddress,
    } = req.body as DeployAssetRequest;
    if (
      !symbol ||
      !name ||
      !decimals ||
      !minCollateralRatio ||
      !annualInterestRate
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if asset already exists
    if (assetConfig[symbol]) {
      res.status(400).json({ error: `Asset ${symbol} already exists` });
      return;
    }

    // Determine if we're using testnet or mainnet
    const isTestnet = process.env.NETWORK === "testnet" || !process.env.NETWORK;
    // Use pre-built wasm file instead of building at runtime

    const wasmpath = findPrebuiltContractsPath("xasset_standard.wasm");

    // Check if the prebuilt wasm exists
    if (!fs.existsSync(wasmpath)) {
      throw new Error(`Pre-built WASM file not found at ${wasmpath}`);
    }

    // Deploy contract using Stellar CLI with pre-built standard wasm
    const serverSecretKey = SERVER_KEYPAIR.secret();
    const deployResult = spawnSync(
      "stellar",
      [
        "contract",
        "deploy",
        "--wasm",
        wasmpath,
        "--source-account",
        serverSecretKey,
      ],
      { encoding: "utf8" }
    );

    if (deployResult.error || deployResult.status !== 0) {
      throw new Error(
        `Contract deployment failed: ${deployResult.stderr || deployResult.error}`
      );
    }

    const contractId = deployResult.stdout.trim();

    // Get the native asset ID first
    const xlmSacResult = spawnSync(
      "stellar",
      ["contract", "id", "asset", "--asset", "native"],
      { encoding: "utf8" }
    );

    if (xlmSacResult.error || xlmSacResult.status !== 0) {
      throw new Error(
        `Failed to get native asset ID: ${xlmSacResult.stderr || xlmSacResult.error}`
      );
    }

    // Trim any whitespace or newlines from the output
    const xlmSacId = xlmSacResult.stdout.trim();

    // Set the admin for the contract
    const adminSetResult = spawnSync(
      "stellar",
      [
        "contract",
        "invoke",
        "--id",
        contractId,
        "--source-account",
        serverSecretKey,
        "--",
        "admin_set",
        "--new-admin",
        SERVER_KEYPAIR.publicKey(),
      ],
      { encoding: "utf8" }
    );

    if (adminSetResult.status !== 0) {
      console.error(`Admin set failed: ${adminSetResult.stderr.toString()}`);
      res.status(500).json({ error: "Failed to set contract admin" });
      return;
    }

    // Initialize contract with the obtained native asset ID
    const initResult = spawnSync(
      "stellar",
      [
        "contract",
        "invoke",
        "--id",
        contractId,
        "--source-account",
        serverSecretKey,
        "--",
        "cdp_init",
        "--xlm_sac",
        xlmSacId,
        "--xlm_contract",
        "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
        "--asset_contract",
        feedAddress,
        "--pegged_asset",
        symbol,
        "--min_collat_ratio",
        `${minCollateralRatio * 100}`,
        "--symbol",
        `x${symbol}`,
        "--name",
        name,
        "--decimals",
        `${decimals}`,
        "--annual_interest_rate",
        `${annualInterestRate * 100}`,
      ],
      { encoding: "utf8" }
    );

    if (initResult.error || initResult.status !== 0) {
      throw new Error(
        `Contract initialization failed: ${initResult.stderr || initResult.error}`
      );
    }

    const mercuryWasmPath = findPrebuiltContractsPath("xasset_mercury.wasm");

    // Check if the prebuilt mercury wasm exists
    if (!fs.existsSync(mercuryWasmPath)) {
      throw new Error(
        `Pre-built Mercury WASM file not found at ${mercuryWasmPath}`
      );
    }

    // TODO Add the asset to the assets table
    console.log("Contract ID: ", contractId);
    const { price } = await getLatestPriceData(
      symbol,
      contractId
    );
    const { price: xlmPrice } = await getLatestPriceData(
      "XLM",
      contractId
    );
    // Create Asset
    const existingAsset = await assetService.findOne(`x${symbol}`);
    console.log("Existing asset", existingAsset)
    if (!existingAsset) {
      console.log("Creating asset in database")
      let asset = new Asset();
      asset.symbol = `x${symbol}`;
      asset.feed_address = feedAddress;
      asset.price = price.toString();
      asset.last_xlm_price = xlmPrice.toString();
      asset = await assetService.insert(asset);
      // Create LiquidityPool
      const liquidityPool = new LiquidityPool();
      liquidityPool.asset = asset;
      liquidityPool.pool_address = contractId;
      liquidityPool.minimum_collateralization_ratio = minCollateralRatio * 100;
      await liquidityPoolService.insert(liquidityPool);
    }
    // TODO Add a liquidity pool with the pool_address as contract di
    // TODO kill contractConfig file
    // TODO kill AssetConfig file
    // TODO stop updating environments.toml file

    const liquidityPools = await liquidityPoolService.findAll()
    const contractIds = liquidityPools.map((lp) => lp.pool_address);
    console.log("DB contract IDs")
    console.log(contractIds)
    console.log("Includes contract ID: ", contractIds.includes(contractId))
    // Deploy to Mercury with Mercury-enabled build
    const mercuryArgs = [
      "mercury-cli",
      "--jwt",
      process.env.RETROSHADE_API_TOKEN!,
      "--mainnet",
      isTestnet ? "false" : "true",
      "retroshade",
      "--project",
      "equitx",
      ...contractIds.flatMap((id) => ["--contracts", id]),
      "--target",
      mercuryWasmPath,
    ];

    console.log(mercuryArgs[0]);
    console.log(mercuryArgs.slice(1));
    const mercuryResult = spawnSync(mercuryArgs[0], mercuryArgs.slice(1), {
      encoding: "utf8",
    });

    if (mercuryResult.error || mercuryResult.status !== 0) {
      throw new Error(
        `Mercury deployment failed: ${mercuryResult.stderr || mercuryResult.error}`
      );
    }

    console.log(mercuryResult)

    // Extract WASM hash from Mercury output
    const wasmHash = mercuryResult.stdout.match(/wasm hash: ([a-f0-9]+)/)?.[1];
    if (!wasmHash) {
      throw new Error("Could not extract WASM hash from Mercury output");
    }

    // Keep track of update failures
    // const updateErrors = [];

    // // Update AssetConfig.ts
    // try {
    //   await updateAssetConfig(symbol, contractId, wasmHash, feedAddress);
    // } catch (err) {
    //   updateErrors.push(`Failed to update AssetConfig.ts: ${err}`);
    // }

    // // Update frontend config if the file exists in the container
    // try {
    //   await updateFrontendConfig(symbol, contractId);
    // } catch (err) {
    //   updateErrors.push(`Failed to update frontend config: ${err}`);
    // }

    // // Update environments.toml if it exists in the container
    // try {
    //   await updateEnvironmentsToml(symbol, contractId);
    // } catch (err) {
    //   updateErrors.push(`Failed to update environments.toml: ${err}`);
    // }

    // // Commit and push to github
    // let gitPushError = null;
    // try {
    //   await commitAndPushChanges(symbol);
    // } catch (err) {
    //   gitPushError = `Failed to commit changes to GitHub: ${err}`;
    //   updateErrors.push(gitPushError);
    // }

    // // If there were update errors but deployment succeeded
    // if (updateErrors.length > 0) {
    //   res.status(207).json({
    //     success: true,
    //     contractId,
    //     wasmHash,
    //     message:
    //       "Contract deployed successfully but failed to update configurations",
    //     errors: updateErrors,
    //     details:
    //       "Please manually update configurations with the provided contract ID and WASM hash",
    //   });
    //   return;
    // }

    res.status(200).json({
      success: true,
      contractId,
      message: `Deployed x${symbol} contract successfully`,
    });
  } catch (error: any) {
    console.error("Error deploying asset:", error);
    res
      .status(500)
      .json({ error: error.message || "An unknown error occurred" });
  }
};

// Update AssetConfig.ts file with new asset
const updateAssetConfig = async (
  symbol: string,
  contractId: string,
  wasmHash: string,
  feedAddress: string
) => {
  const configPath = path.resolve(__dirname, "../config/AssetConfig.ts");

  let configContent = "interface AssetDetails {\n";
  configContent += "  feed_address: string;\n";
  configContent += "  pool_address: string;\n";
  configContent += "  wasm_hash: string;\n";
  configContent += "}\n\n";
  configContent += "export interface AssetConfig {\n";
  configContent += "  [key: string]: AssetDetails;\n";
  configContent += "}\n\n";
  configContent +=
    'export const XLM_FEED_ADDRESS = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";\n';
  configContent += "export const assetConfig: AssetConfig = {\n";
  let xSymbol = "x" + symbol;

  const newAssetConfig = {
    ...assetConfig,
    [xSymbol]: {
      feed_address: feedAddress,
      pool_address: contractId,
      wasm_hash: wasmHash,
    },
  };

  Object.entries(newAssetConfig).forEach(([key, value]) => {
    configContent += `  '${key}': {\n`;
    configContent += `    feed_address: "${value.feed_address}",\n`;
    configContent += `    pool_address: "${value.pool_address}",\n`;
    configContent += `    wasm_hash: "${value.wasm_hash}",\n`;
    configContent += "  },\n";
  });

  configContent += "}\n";

  fs.writeFileSync(configPath, configContent);
};

// Update frontend contractConfig.ts file
const updateFrontendConfig = async (symbol: string, contractId: string) => {
  try {
    const xSymbol = symbol.startsWith("x") ? symbol : `x${symbol}`;
    const configPath = path.resolve(
      __dirname,
      "../../../src/contracts/contractConfig.ts"
    );
    const utilPath = path.resolve(__dirname, "../../../src/contracts/util.ts");

    // Update contractConfig.ts
    let content = fs.readFileSync(configPath, "utf8");

    // Check if the file has the expected format
    if (!content.includes("export const contractMapping = {")) {
      throw new Error("contractConfig.ts has unexpected format");
    }

    // Add new contract to the mapping
    const insertPoint = content.indexOf("} as const;");
    if (insertPoint === -1) {
      throw new Error("Could not find insertion point in contractConfig.ts");
    }

    // Find the last entry to determine if we need to add a comma
    const lastEntry = content.lastIndexOf(",", insertPoint);
    const needsComma =
      content.substring(lastEntry + 1, insertPoint).trim().length > 0;

    // Insert the new contract
    const updatedContent =
      content.slice(0, insertPoint) +
      (needsComma ? "," : "") +
      `\n  ${xSymbol}: "${contractId}"` +
      content.slice(insertPoint);

    fs.writeFileSync(configPath, updatedContent);

    // Update util.ts to add the new client
    let utilContent = fs.readFileSync(utilPath, "utf8");

    // Find the client map
    const clientMapStartIndex = utilContent.indexOf(
      "const contractClientMap = {"
    );
    const clientMapEndIndex = utilContent.indexOf(
      "} as const;",
      clientMapStartIndex
    );

    if (clientMapStartIndex === -1 || clientMapEndIndex === -1) {
      throw new Error("Could not find contractClientMap in util.ts");
    }

    // Insert the new client before the end of the map
    const clientToAdd = `
  ${xSymbol}: new Client({
    networkPassphrase,
    contractId: contractMapping.${xSymbol},
    rpcUrl,
    publicKey: undefined,
  }),`;

    const updatedUtilContent =
      utilContent.slice(0, clientMapEndIndex) +
      clientToAdd +
      utilContent.slice(clientMapEndIndex);

    fs.writeFileSync(utilPath, updatedUtilContent);

    // Add to the list of files to commit
    return true;
  } catch (error) {
    console.error("Error updating frontend config:", error);
    throw error;
  }
};

// Add this as a new function after updateFrontendConfig
const updateEnvironmentsToml = async (symbol: string, contractId: string) => {
  try {
    const xSymbol = symbol.startsWith("x") ? symbol : `x${symbol}`;
    const envTomlPath = path.resolve(__dirname, "../../../environments.toml");

    let tomlContent = fs.readFileSync(envTomlPath, "utf8");

    // Find the [staging.contracts] section
    const stagingContractsIndex = tomlContent.indexOf("[staging.contracts]");
    if (stagingContractsIndex === -1) {
      throw new Error(
        "Could not find [staging.contracts] section in environments.toml"
      );
    }

    // Find the end of staging.contracts section or the beginning of a new section
    let endIndex = tomlContent.indexOf("[", stagingContractsIndex + 1);
    if (endIndex === -1) {
      // If there's no next section, use the end of the file
      endIndex = tomlContent.length;
    }

    // Insert the new contract right before the end of the section
    const contractEntry = `${xSymbol} = { id = "${contractId}" }\n`;

    const updatedTomlContent =
      tomlContent.slice(0, endIndex) +
      contractEntry +
      tomlContent.slice(endIndex);

    fs.writeFileSync(envTomlPath, updatedTomlContent);
    return true;
  } catch (error) {
    console.error("Error updating environments.toml:", error);
    throw error;
  }
};
