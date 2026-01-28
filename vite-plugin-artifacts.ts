import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type { Plugin } from "vite";

interface ArtifactData {
  abi: unknown[];
  contractName: string;
  sourceName?: string;
  buildInfoId?: string;
  sourceCode?: string;
  buildInfo?: unknown;
  deployments: string[];
}

interface DeployedAddresses {
  [key: string]: string;
}

type AddressMap = Record<string, ArtifactData>;

const IGNITION_PATHS = [
  "hardhat-node-test/ignition/deployments/chain-31337",
  "./artifacts",
];

function findIgnitionDeployment(rootDir: string): string | null {
  for (const relativePath of IGNITION_PATHS) {
    const fullPath = resolve(rootDir, relativePath);
    const deployedAddressesPath = join(fullPath, "deployed_addresses.json");

    if (existsSync(deployedAddressesPath)) {
      console.log(`[dev-artifacts] Found deployment at: ${fullPath}`);
      return fullPath;
    }
  }
  return null;
}

function loadArtifacts(deploymentPath: string, rootDir: string): AddressMap {
  const addressMap: AddressMap = {};

  // Read deployed_addresses.json
  const deployedAddressesPath = join(deploymentPath, "deployed_addresses.json");
  if (!existsSync(deployedAddressesPath)) {
    console.warn("[dev-artifacts] deployed_addresses.json not found");
    return addressMap;
  }

  const deployedAddresses: DeployedAddresses = JSON.parse(
    readFileSync(deployedAddressesPath, "utf-8")
  );

  // Build contract name to address mapping
  const contractDeployments: Record<string, string> = {};
  for (const [moduleContract, address] of Object.entries(deployedAddresses)) {
    const contractName = moduleContract.split("#")[1];
    if (contractName) {
      contractDeployments[contractName] = address;
    }
  }

  // Read artifacts directory
  const artifactsDir = join(deploymentPath, "artifacts");
  if (!existsSync(artifactsDir)) {
    console.warn("[dev-artifacts] artifacts directory not found");
    return addressMap;
  }

  const artifactFiles = readdirSync(artifactsDir).filter((f) => f.endsWith(".json"));

  // Build-info directory
  const buildInfoDir = join(deploymentPath, "build-info");

  // Contracts source directory (for source code)
  const contractsDir = resolve(rootDir, "hardhat-node-test/contracts");

  for (const artifactFile of artifactFiles) {
    const artifactPath = join(artifactsDir, artifactFile);
    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

    const contractName = artifact.contractName;
    if (!contractName) continue;

    const deployedAddress = contractDeployments[contractName];
    if (!deployedAddress) continue;

    const artifactData: ArtifactData = {
      abi: artifact.abi || [],
      contractName,
      sourceName: artifact.sourceName,
      buildInfoId: artifact.buildInfoId,
      deployments: [deployedAddress],
    };

    // Try to load build info
    if (artifact.buildInfoId && existsSync(buildInfoDir)) {
      const buildInfoPath = join(buildInfoDir, `${artifact.buildInfoId}.json`);
      if (existsSync(buildInfoPath)) {
        try {
          artifactData.buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf-8"));
        } catch {
          // Ignore build info errors
        }
      }
    }

    // Try to load source code
    if (artifact.sourceName && existsSync(contractsDir)) {
      // sourceName is like "contracts/Counter.sol", extract just the filename
      const sourceFileName = artifact.sourceName.split("/").pop();
      if (sourceFileName) {
        const sourcePath = join(contractsDir, sourceFileName);
        if (existsSync(sourcePath)) {
          try {
            artifactData.sourceCode = readFileSync(sourcePath, "utf-8");
          } catch {
            // Ignore source code errors
          }
        }
      }
    }

    // Store by lowercase address
    addressMap[deployedAddress.toLowerCase()] = artifactData;
  }

  console.log(
    `[dev-artifacts] Loaded ${Object.keys(addressMap).length} contract artifacts`
  );
  return addressMap;
}

export function devArtifactsPlugin(): Plugin {
  return {
    name: "dev-artifacts",
    apply: "serve",
    config(_, { command }) {
      if (command !== "serve") {
        return {};
      }

      const rootDir = process.cwd();
      const deploymentPath = findIgnitionDeployment(rootDir);

      if (!deploymentPath) {
        console.log("[dev-artifacts] No Ignition deployment found, skipping artifact injection");
        return {
          define: {
            __DEV_ARTIFACTS__: "null",
          },
        };
      }

      const artifacts = loadArtifacts(deploymentPath, rootDir);

      return {
        define: {
          __DEV_ARTIFACTS__: JSON.stringify(artifacts),
        },
      };
    },
  };
}
