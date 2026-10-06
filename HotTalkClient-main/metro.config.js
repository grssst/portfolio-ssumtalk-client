// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = (() => {
    const config = getDefaultConfig(__dirname);
    config.watchFolders = [
        ...config.watchFolders || [],
        `${__dirname}/assets`, // assets 폴더 경로 추가
    ];
    config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif');
    return config;
})();