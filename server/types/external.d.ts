declare module "multer" {
  const anyExport: any;
  export default anyExport;
}

declare module "csv-parse/sync" {
  export function parse(input: string, options?: any): any[];
  const defaultExport: any;
  export default defaultExport;
}

declare namespace Express {
  interface Request {
    file?: any;
  }
}
