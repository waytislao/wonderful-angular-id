import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as sass from 'sass';

export class WorkSpaceUtils {
    public static sendHTMLAndCSSToWebview(fileFullPath: string, panel: vscode.WebviewPanel) {
        let rawHTML: string;
        let htmlWarpElement: string;
        let rawCSS: string;
        fs.readFile(fileFullPath, 'utf-8', (err, data) => {
            if (err) {
                vscode.window.showInformationMessage(`Can't open ${fileFullPath}`);
                console.error(err);
                return;
            }
            rawHTML = data;
            rawCSS = `<style>${this.getCss(fileFullPath)}</style>`;
            panel.webview.postMessage({
                command: 'data',
                data: {
                    rawHTML: rawHTML, rawCSS: rawCSS
                }
            });
            // Change how to handle the file content
            // console.log("The file content is : " + data);
        });
    }

    public static getCss(fileFullPath: string) {
        const dirname = path.dirname(fileFullPath);
        console.log(dirname);

        if (dirname) {
            const cssResult = fs.readdirSync(dirname)
                .filter(file => path.extname(file) === '.scss' || path.extname(file) === '.css')
                .map(cssFile => {
                    return sass.renderSync({ file: path.join(dirname, cssFile) });
                });
            console.log(cssResult);

            return cssResult.filter(item => !!item).map(item => item.css.toString()).join('\n');
        }
    }

}