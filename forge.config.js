module.exports = {
    packagerConfig: {
        name: 'WhatItDo',
        icon: 'src/assets/img/question-mark-circle-16',
        asar: true,
        extraResource: [
            'src/assets/video/JohnCenaEntrance.mp4',
        ]
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: "WhatItDo",
                setupExe: 'WhatItDo-Setup.exe',
                setupIcon: 'src/assets/img/question-mark-circle-16.ico',
                noMsi: true,
                authors: "etm_",
                description: 'Track what it do'
            }
        }
    ]
};
