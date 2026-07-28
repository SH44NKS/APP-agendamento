export const MASTER_EMAIL="alissons.silva25@gmail.com";

export function isMasterEmail(email?:string|null){
  return email?.trim().toLowerCase()===MASTER_EMAIL;
}

export function isAdminUser(email?:string|null,papel?:string|null){
  return papel==="admin"||isMasterEmail(email);
}
