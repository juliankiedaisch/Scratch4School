import jpegThumbnail from './jpeg-thumbnail';
import getCostumeUrl from '../get-costume-url';

const costumePayload = (scratchStorage, costume) => {
    // TODO is it ok to base64 encode SVGs? What about unicode text inside them?
    const assetDataUrl = costume.asset.encodeDataURI();
    const assetDataFormat = (costume.dataFormat || '').toLowerCase();

    const payload = {
        type: 'costume',
        name: costume.name,
        // Params to be filled in below
        mime: '',
        body: '',
        thumbnail: ''
    };

    // Known image format to MIME type mapping
    const formatToMime = {
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        bmp: 'image/bmp',
        webp: 'image/webp',
        avif: 'image/avif',
        // iPhone/iPad photos are often HEIC/HEIF
        heic: 'image/heic',
        heif: 'image/heif',
        'heic-sequence': 'image/heic-sequence',
        'heif-sequence': 'image/heif-sequence',
        // sometimes users export/scans as TIFF
        tif: 'image/tiff',
        tiff: 'image/tiff'
        // add more as needed
    };

    const parseDataUrl = (dataUrl) => {
        // Expect a data URL like: data:<mime>;base64,<data>
        const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
        if (!match) return null;
        return { mime: match[1], body: match[2] };
    };

    // Prefer using the MIME type based on dataFormat if we recognize it,
    // otherwise parse generically from the data URL.
    const knownMime = formatToMime[assetDataFormat];
    if (knownMime) {
        const expectedPrefix = `data:${knownMime};base64,`;
        if (assetDataUrl.startsWith(expectedPrefix)) {
            payload.mime = knownMime;
            payload.body = assetDataUrl.slice(expectedPrefix.length);
        } else {
            // Fallback: parse whatever MIME is actually present
            const parsed = parseDataUrl(assetDataUrl);
            if (parsed) {
                payload.mime = parsed.mime;
                payload.body = parsed.body;
            } else {
                // eslint-disable-next-line no-alert
                alert(`Cannot parse data URL for format: ${assetDataFormat}`);
                return Promise.reject(new Error(`Cannot parse data URL for format: ${assetDataFormat}`));
            }
        }
    } else {
        const parsed = parseDataUrl(assetDataUrl);
        if (parsed) {
            payload.mime = parsed.mime;
            payload.body = parsed.body;
        } else {
            // eslint-disable-next-line no-alert
            alert(`Cannot serialize for format: ${assetDataFormat}`);
            return Promise.reject(new Error(`Cannot serialize for format: ${assetDataFormat}`));
        }
    }

    // Do not generate the thumbnail from the raw asset. Instead use the getCostumeUrl
    // utility which inlines the fonts to make the thumbnail show the right fonts.
    const inlinedFontDataUrl = getCostumeUrl(scratchStorage, costume.asset);

    // Note: Many browsers cannot decode HEIC/HEIF. If jpegThumbnail depends on browser
    // decoding, it may fail. Catch and continue so HEIC images don't break serialization.
    return jpegThumbnail(inlinedFontDataUrl)
        .then(thumbnail => {
            payload.thumbnail = thumbnail.replace('data:image/jpeg;base64,', '');
            return payload;
        })
        .catch(err => {
            // Optional: log for debugging, keep payload without thumbnail
            // console.warn('Thumbnail generation failed:', err);
            payload.thumbnail = '';
            return payload;
        });
};

export default costumePayload;