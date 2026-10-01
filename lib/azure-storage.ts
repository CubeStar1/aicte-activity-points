import { BlobServiceClient } from "@azure/storage-blob";

export function evidenceContainer() {
  return BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
  ).getContainerClient(process.env.AZURE_STORAGE_CONTAINER!);
}
