type LogFn = (message?: any, ...optionalParams: any[]) => void;

export type Logger = {
  log: LogFn;
  warn: LogFn;
  error: LogFn;
};

export function buildLogger(verbose: boolean): Logger {
  return {
    log: (message?: any, ...optionalParams: any[]) => {
      if (verbose || message instanceof Error) {
        console.log(message, ...optionalParams);
      }
    },
    warn: console.warn,
    error: console.error,
  };
}
