var vscode = require('vscode');

function activate(context) {
  console.log('activate');

  context.subscriptions.push(
    vscode.commands.registerCommand('ohm.edit', () => {
      vscode.commands.executeCommand(
        'vscode.openWith',
        vscode.window.activeTextEditor?.document.uri,
        'ohm.editor',
        {
          viewColumn: vscode.ViewColumn.Beside,
        }
      );
    })
  );

  const providerRegistration = vscode.window.registerCustomEditorProvider(
    'ohm.editor',
    new OhmEditorProvider()
  );

  context.subscriptions.push(providerRegistration);
}

class OhmEditorProvider {
  async resolveCustomTextEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: 'update',
        text: document.getText(),
      });
    }

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    updateWebview();
  }

  getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  getHtmlForWebview(webview) {
    const nonce = this.getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <!--
          Use a content security policy to only allow loading images from https or from our extension directory,
          and only allow scripts that have a specific nonce.
          -->
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; frame-src https://ohmjs.org/" />
          
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          
          <title>Ohm Editor</title>

          <style nonce="${nonce}">
           iframe {
            overflow: hidden; 
            height:100%; 
            width:100%; 
            position: absolute; 
            top: 0px; 
            left: 0px; 
            right: 0px; 
            bottom: 0px;
           }
          </style>
        </head>
        <body>
          <iframe id="ohm-editor"
            src="https://ohmjs.org/editor/"
            width="100%"
            height="100%
          >
          </iframe>

          <script type="module" crossorigin nonce="${nonce}">
            const vscode = acquireVsCodeApi();

            function updateContent(text) {
              console.log(text);
            }
            
            const state = vscode.getState();
            if (state) {
              updateContent(state.text);
            }
            
            window.addEventListener('message', (event) => {
              const message = event.data;
            
              switch (message.type) {
                case 'update': {
                  const { text } = message;
                  updateContent(text);
                  vscode.setState({ text });
                  return;
                }
              }
            });
          </script>
        </body>
      </html>`;
  }
}

module.exports = { activate };
