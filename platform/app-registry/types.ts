export interface PlatformAppManifest {
  id: string;
  name: string;
  basePath: string;
  apiPrefix: string;
  description?: string;
  permissions?: string[];
}
