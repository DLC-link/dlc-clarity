export interface Value {
  hex: string;
  repr: string;
}

export interface Result {
  asset_identifier: string;
  value: Value;
  block_height: number;
  tx_id: string;
}

export interface NFTHoldingsData {
  limit: number;
  offset: number;
  total: number;
  results: Result[];
}

export interface DeploymentPlan {
  id: number;
  name: string;
  network: string;
  'stacks-node': string;
  'bitcoin-node': string;
  plan: Plan;
}

export interface Plan {
  batches: Batch[];
}

export interface Batch {
  id: number;
  transactions: Transaction[];
  epoch: string;
}

export interface Transaction {
  'requirement-publish'?: RequirementPublish;
  'contract-publish'?: ContractPublish;
  'contract-call'?: ContractCall;
}

export interface ContractCall {
  'contract-id': string;
  'expected-sender': string;
  method: string;
  parameters: string[];
  cost: number;
}

export interface ContractPublish {
  'contract-name': string;
  'expected-sender': string;
  cost: number;
  path: string;
  'anchor-block-only': boolean;
  'clarity-version': number;
}

export interface RequirementPublish {
  'contract-id': string;
  'remap-sender': string;
  'remap-principals': any;
  cost: number;
  path: string;
  'clarity-version': number;
}
