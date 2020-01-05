import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class HTMLFileProvider implements vscode.TreeDataProvider<HTMLItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<HTMLItem | undefined> = new vscode.EventEmitter<HTMLItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<HTMLItem | undefined> = this._onDidChangeTreeData.event;

	private readonly extension: RegExp[] = [/.html$/];
	private readonly excludeFileName: RegExp[] = [/^\./, /node_modules/, /dist/];
	constructor(private workspaceRoot: string) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: HTMLItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: HTMLItem): Thenable<HTMLItem[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		const parentPath = element ? element.fullPath : this.workspaceRoot;
		return Promise.resolve(
			fs.readdirSync(parentPath)
				.filter(fileName => this.filterChildren(parentPath, fileName))
				.filter(fileName => {
					const fullPath = path.join(parentPath, fileName);
					return !fs.statSync(fullPath).isDirectory() ||
						fs.readdirSync(fullPath).filter(item => this.filterChildren(fullPath, item)).length > 0;
				})
				.map(fileName => {
					const fullPath = path.join(parentPath, fileName);
					const isDir = fs.statSync(fullPath).isDirectory();
					return new HTMLItem(
						fileName,
						fullPath,
						isDir ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
						isDir,
						isDir ? undefined : {
							command: 'extension.openPackageOnNpm',
							title: '',
							arguments: [fileName, fullPath]
						}
					);
				})
		);

	}

	private filterChildren(parentPath: string, fileName: string): boolean {
		return !this.excludeFileName.find(ex => !!fileName.match(ex)) &&
			(!!this.extension.find(ex => !!fileName.match(ex)) ||
				fs.statSync(path.join(parentPath, fileName)).isDirectory());
	}
}

export class HTMLItem extends vscode.TreeItem {

	iconFile?: string;
	iconPath?: { light: string; dark: string };

	constructor(
		public readonly name: string,
		public readonly fullPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly isDir: boolean,
		public readonly command?: vscode.Command,

	) {
		super(name, collapsibleState);
		if (!this.isDir) {
			switch (path.extname(this.name)) {
				case '.html':
					this.iconFile = 'html.svg';
			}
		}

		this.iconPath = this.iconFile ? {
			light: path.join(__filename, '..', '..', '..', 'resources', 'light', this.iconFile),
			dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', this.iconFile)
		} : undefined;
	}

	get tooltip(): string {
		return `${this.name}`;
	}

	get description(): string {
		return '';
	}

	contextValue = 'dependency';

}
