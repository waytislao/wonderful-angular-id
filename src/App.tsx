import * as React from 'react';
import './App.css';

import logo from './logo.svg';

import $ from 'jquery';
import SplitterLayout from 'react-splitter-layout';
import 'react-splitter-layout/lib/index.css';

import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

import HtmlToReact from 'html-to-react';
const htmlToReactParser = new HtmlToReact.Parser();

interface vscode {
  postMessage(message: any): void;
}
declare const vscode: vscode;

const darkTheme = createMuiTheme({
  palette: {
    // Switching the dark mode on is a single property value change.
    type: 'dark',
  },
});

class App extends React.Component<{}, {
  rawCSS: string,
  rawHTML: string,
  reactHTML: any,
  reactCSS: any,
  selected: number
}> {
  private myRef: React.RefObject<HTMLDivElement>;

  constructor(props: any) {
    super(props);
    this.state = {
      rawCSS: '',
      rawHTML: '',
      reactCSS: undefined,
      reactHTML: undefined,
      selected: -1
    };

    vscode.postMessage({
      command: 'get-data'
    })

    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent

      switch (message.command) {
        case 'data':
          this.setState({
            rawCSS: message.data.rawCSS,
            rawHTML: message.data.rawHTML,
            reactCSS: htmlToReactParser.parse(message.data.rawCSS),
            reactHTML: htmlToReactParser.parse(message.data.rawHTML)
          });
          this.applyIDSelector();
          break;
      }
    });

    this.myRef = React.createRef<HTMLDivElement>();
  }

  public render() {
    return (
      <div className="App">
        <SplitterLayout primaryIndex={0} primaryMinSize={80} percentage={true}>
          <div className="html-warp-space" ref={this.myRef}>
            {this.state.reactCSS}
            {this.state.reactHTML}
          </div>
          <ThemeProvider theme={darkTheme}>
            <div className="id-panel">
              <FormControl>
                <TextField id="outlined-basic" label="Outlined" variant="outlined" />
              </FormControl>
              <FormControl variant="outlined" >
                <InputLabel id="demo-customized-select-label">Age</InputLabel>
                <Select
                  labelId="demo-customized-select-label"
                  id="demo-customized-select"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value={10}>Ten</MenuItem>
                  <MenuItem value={20}>Twenty</MenuItem>
                  <MenuItem value={30}>Thirty</MenuItem>
                </Select>
              </FormControl>
            </div>
          </ThemeProvider>
        </SplitterLayout>
      </div>
    );
  }

  private applyIDSelector() {
    const elements: any[] = [];
    const IDValues: any[] = [];
    const IDValuesElementType: any[] = [];

    if (this.myRef.current) {
      this.myRef.current.querySelectorAll('input,h1,h2,h3,h4,h5,.content-header-title,button,a,small')
        .forEach((el, index) => {
          elements.push(el);
          const $elRef = $(el);
          IDValues.push($elRef.attr('id'));
          IDValuesElementType.push('input');

          const $warpRef = $(`<div id="need-id-warp-${index}" class='need-id-element ${!!IDValues[index] ? 'exist-id' : ''}' style="display: ${$elRef.css('display')};"
  data-toggle="popover" ></div>`).on('click', () => {
            $(`#need-id-input-${index}`).focus();
            this.setState({ selected: index });
          });
          $elRef.wrap($warpRef);
        });
    }
  }
}

export default App;
