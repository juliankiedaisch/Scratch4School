import {ScratchStorage, Asset} from 'scratch-storage';

import defaultProject from './default-project';
import {GUIStorage, TranslatorFunction} from '../gui-config';

import saveProjectToServer from '../lib/save-project-to-server';

export class LegacyStorage implements GUIStorage {
    private projectHost?: string;
    private projectToken?: string;
    private assetHost?: string;
    private backpackHost?: string;
    private translator?: TranslatorFunction;

    readonly scratchStorage = new ScratchStorage();

    constructor () {
        this.cacheDefaultProject(this.scratchStorage);
        this.addOfficialScratchWebStores(this.scratchStorage);
    }

    setProjectHost (host: string): void {
        this.projectHost = host;
    }

    setProjectToken (token: string): void {
        this.projectToken = token;
    }

    setProjectMetadata (projectId: string | null | undefined): void {
        const {RequestMetadata, setMetadata, unsetMetadata} = this.scratchStorage.scratchFetch;

        // If project ID is '0' or zero, it's not a real project ID. In that case, remove the project ID metadata.
        // Same if it's null undefined.
        if (projectId && projectId !== '0') {
            setMetadata(RequestMetadata.ProjectId, projectId);
        } else {
            unsetMetadata(RequestMetadata.ProjectId);
        }
    }

    setAssetHost (host: string): void {
        this.assetHost = host;
    }

    setTranslatorFunction (translator: TranslatorFunction): void {
        this.translator = translator;

        // TODO: Verify that this is correct
        this.cacheDefaultProject(this.scratchStorage);
    }

    setBackpackHost (host: string): void {
        const shouldAddSource = !this.backpackHost;
        if (shouldAddSource) {
            const AssetType = this.scratchStorage.AssetType;

            this.scratchStorage.addWebStore(
                [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
                this.getBackpackAssetURL.bind(this)
            );
        }

        this.backpackHost = host;
    }

    saveProject (
        projectId: number,
        vmState: string,
        params: { originalId: string; isCopy: boolean; isRemix: boolean; title: string; }
    ): Promise<{ id: string | number; }> {
        if (!this.projectHost) {
            return Promise.reject(new Error('Project host not set'));
        }
        // Haven't inlined the code here so that we can keep Git history on the implementation, just in case
        return saveProjectToServer(this.projectHost, projectId, vmState, params);
    }

    saveProjectThumbnail = function (projectId, dataURL) {
    // Log that we're attempting to save a thumbnail
    console.info(`Saving thumbnail for project ${projectId}`);
    
    return new Promise((resolve, reject) => {
        if (!projectId) {
            reject(new Error('Cannot save thumbnail without a project ID'));
            return;
        }
        
        // Make sure we have a session ID
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            reject(new Error('No session ID found, cannot save thumbnail'));
            return;
        }
        
        // Safely handle dataURL - check if it's a string and has the expected format
        let thumbnailBlob;
        
        try {
            if (typeof dataURL === 'string' && dataURL.startsWith('data:')) {
                // Handle data URL string
                const parts = dataURL.split(',');
                if (parts.length !== 2) {
                    throw new Error('Invalid data URL format');
                }
                
                const byteString = atob(parts[1]);
                const mimeString = parts[0].split(':')[1].split(';')[0];
                
                const arrayBuffer = new ArrayBuffer(byteString.length);
                const intArray = new Uint8Array(arrayBuffer);
                
                for (let i = 0; i < byteString.length; i++) {
                    intArray[i] = byteString.charCodeAt(i);
                }
                
                thumbnailBlob = new Blob([arrayBuffer], {type: mimeString});
            } else if (dataURL instanceof HTMLCanvasElement) {
                // Handle canvas element
                console.info('Converting canvas to blob for thumbnail');
                return new Promise(resolve => {
                    dataURL.toBlob(blob => {
                        resolve(blob);
                    }, 'image/png');
                })
                .then(blob => {
                    if (blob) uploadThumbnailBlob(blob);
                    else resolve({});
                })
                .catch(err => {
                    console.warn('Error converting canvas to blob:', err);
                    resolve({}); // Resolve anyway to not block the save process
                });
            } else {
                // Create a default thumbnail if dataURL is invalid
                console.warn('Invalid thumbnail data, creating default thumbnail');
                const canvas = document.createElement('canvas');
                canvas.width = 480;
                canvas.height = 360;
                const ctx = canvas.getContext('2d');
                
                // TypeScript null check - ensure ctx is not null before using it
                if (ctx) {
                    ctx.fillStyle = '#159cff'; // Scratch blue
                    ctx.fillRect(0, 0, 480, 360);
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 36px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Project', 240, 180);
                    
                    return new Promise(resolve => {
                        canvas.toBlob(blob => {
                            resolve(blob);
                        }, 'image/png');
                    })
                    .then(blob => {
                        if (blob) uploadThumbnailBlob(blob);
                        else resolve({});
                    })
                    .catch(err => {
                        console.warn('Error creating default thumbnail:', err);
                        resolve({}); // Resolve anyway to not block the save process
                    });
                } else {
                    // Canvas 2D context not available
                    console.warn('Canvas 2D context not available');
                    resolve({});
                    return;
                }
            }
        } catch (e) {
            console.warn('Error processing thumbnail data:', e);
            resolve({}); // Resolve anyway to not block the save process
            return;
        }
        
        // If we reach this point, we have a valid thumbnailBlob
        if (thumbnailBlob) {
            uploadThumbnailBlob(thumbnailBlob);
        } else {
            resolve({}); // Resolve with empty object if no thumbnail blob
        }
        
        // Helper function to upload the thumbnail blob
        function uploadThumbnailBlob(blob) {
            // Create a FormData object and append the file
            const formData = new FormData();
            formData.append('thumbnail', blob, 'thumbnail.png');
            
            // Use the correct URL pattern with /backend prefix
            const url = `/backend/api/projects/${projectId}/thumbnail`;
            
            // Fix the type error: sessionId is string | null, but we've checked it's not null above
            // Use type assertion to tell TypeScript that sessionId is definitely a string here
            const headers: HeadersInit = {
                'X-Session-ID': sessionId as string // Type assertion fixes the error
            };
            
            fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    console.warn(`Thumbnail upload failed with status: ${response.status}`);
                    return response.text().then(text => {
                        throw new Error(`Thumbnail upload failed: ${text}`);
                    });
                }
                return response.json();
            })
            .then(body => {
                console.info('Thumbnail upload successful');
                resolve(body);
            })
            .catch(err => {
                console.warn('Error uploading thumbnail:', err);
                // Resolve anyway since thumbnail upload isn't critical
                resolve({});
            });
        }
    });
};

    private cacheDefaultProject (storage: ScratchStorage) {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => storage.builtinHelper._store(
            storage.AssetType[asset.assetType],
            storage.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }

    private addOfficialScratchWebStores (storage: ScratchStorage) {
        storage.addWebStore(
            [storage.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );

        storage.addWebStore(
            [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );

        storage.addWebStore(
            [storage.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );

        storage.addWebStore(
            [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
            this.getAssetGetConfigBackend.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );

    }


    private getProjectGetConfig (projectAsset) {
        const path = `${this.projectHost}/${projectAsset.assetId}`;
        const qs = this.projectToken ? `?token=${this.projectToken}` : '';
        return path + qs;
    }

    private getProjectCreateConfig () {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }

    private getProjectUpdateConfig (projectAsset: Asset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }

    private getAssetGetConfigBackend (asset: Asset) {
        return `/backend/api/assets/${asset.assetId}`;
    }

    private getAssetGetConfig (asset: Asset) {
        return `${this.assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
    }
    private getAssetCreateConfig (asset: Asset) {
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`,
            withCredentials: true
        };
    }

    private getBackpackAssetURL (asset) {
        return `${this.backpackHost}/${asset.assetId}.${asset.dataFormat}`;
    }

}
