export interface Product {
  id: string;
  name: string;
  createdAt: Date;
  [fieldName: string]: string | Date;
}
