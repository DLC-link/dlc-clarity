export interface ScriptFunction {
  name: string,
  action: (loanID?: number) => any
}
