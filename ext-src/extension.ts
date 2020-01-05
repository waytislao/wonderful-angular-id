import * as path from 'path';
import * as vscode from 'vscode';
import { HTMLFileProvider } from './htmlFiles';
import { WorkSpaceUtils } from './webviews';

export function activate(context: vscode.ExtensionContext) {
	const currentPanels: Map<string, ReactPanel> = new Map();

	const htmlFilesProvider = new HTMLFileProvider(vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length ? vscode.workspace.workspaceFolders[0].uri.path : '');
	vscode.window.registerTreeDataProvider('nodeDependencies', htmlFilesProvider);

	vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => htmlFilesProvider.refresh());
	vscode.commands.registerCommand('extension.openPackageOnNpm', (fileName, fullPath) => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		const panelType = `${fullPath}.panel`;
		let currentPanel = currentPanels.get(panelType);

		if (!!currentPanel) {
			currentPanel.panel.reveal(columnToShowIn);
		} else {
			// Create and show panel
			currentPanels.set(panelType, ReactPanel.createOrShow(fullPath, context.extensionPath, columnToShowIn || vscode.ViewColumn.One));
		}
	

	});

}

/**
 * Manages react webview panels
 */
class ReactPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */

	private static readonly viewType = 'react';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];
	private _fullPath: string;

	public static createOrShow(fullPath: string, extensionPath: string, column: vscode.ViewColumn) {
		return new ReactPanel(fullPath, extensionPath, column);
	}

	private constructor(fullPath: string, extensionPath: string, column: vscode.ViewColumn) {
		this._extensionPath = extensionPath;
		this._fullPath = fullPath;

		// Create and show a new webview panel
		this._panel = vscode.window.createWebviewPanel(ReactPanel.viewType, `${path.basename(this._fullPath)} - Wonderful Ng HTML`, column, {
			// Enable javascript in the webview
			enableScripts: true,

			// And restric the webview to only loading content from our extension's `media` directory.
			localResourceRoots: [
				vscode.Uri.file(path.join(this._extensionPath, 'build'))
			]
		});

		// Set the webview's initial html content 
		this._panel.webview.html = this._getHtmlForWebview();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.text);
					return;
				case 'get-data':
					WorkSpaceUtils.sendHTMLAndCSSToWebview(fullPath, this._panel)
					return;
			}
		}, null, this._disposables);

	}

	get panel() {
		return this._panel;
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview() {
		const manifest = require(path.join(this._extensionPath, 'build', 'asset-manifest.json'));
		const mainScript = manifest['files']['main.js'];
		const mainStyle = manifest['files']['main.css'];

		const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainScript));
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
		const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainStyle));
		const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>React App</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })}/">
				<meta name="current-html-file-path" content="${this._fullPath}">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<script nonce="${nonce}">
                        const vscode = acquireVsCodeApi();
                </script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// this method is called when your extension is deactivated
export function deactivate() { }
