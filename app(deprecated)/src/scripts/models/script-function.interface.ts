import { FunctionArgs } from "./function-args.interface";

export interface ScriptFunction {
  name: string,
  action: (args: FunctionArgs) => any
}
