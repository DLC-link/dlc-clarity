import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DeploymentPlan, ContractPublish } from './models/models.js';

export async function readConfig(file: string, _: string): Promise<DeploymentPlan> {
  try {
    const fileContents = fs.readFileSync(`./deployments/${file}`, 'utf8');
    const config = yaml.load(fileContents);
    return config as DeploymentPlan;
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    return null;
  }
}

export async function readRemoteConfig(file: string, branch: string): Promise<DeploymentPlan> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/DLC-link/dlc-clarity/${branch}/deployments/${file}`
    );
    const json = await response.text();
    const config = yaml.load(json);
    return config as DeploymentPlan;
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    return null;
  }
}

export function getDlcManagerDeployment(config: DeploymentPlan) {
  let dlcManagerDeployment: ContractPublish;
  for (const batch of config.plan.batches) {
    for (const tx of batch.transactions) {
      if (tx['contract-publish']) {
        if (/contracts\/dlc-manager(-v\d+)?\.clar/.test(tx['contract-publish']['path'])) {
          dlcManagerDeployment = tx['contract-publish'];
        }
      }
    }
  }
  console.log('dlcManagerDeployment', dlcManagerDeployment);
  return dlcManagerDeployment;
}

export function getSampleContractDeployment(config: DeploymentPlan) {
  let sampleContractDeployment: ContractPublish;
  for (const batch of config.plan.batches) {
    for (const tx of batch.transactions) {
      if (tx['contract-publish']) {
        if (/examples\/sample-contract-loan(-v\d+)?\.clar/.test(tx['contract-publish']['path'])) {
          sampleContractDeployment = tx['contract-publish'];
        }
      }
    }
  }
  console.log('sampleContractDeployment', sampleContractDeployment);
  return sampleContractDeployment;
}
