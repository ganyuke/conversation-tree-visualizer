# Conversation Tree Visualizer
View your AI slop in a web app written by that very AI slop machine. Accepts JSON conversation exports from ChatGPT (check out [ChatGPT Exporter](https://github.com/pionxzh/chatgpt-exporter) to obtain these).

Built with [d3](https://d3js.org/) and extensive use of Sam Altman's [pet robot](https://chatgpt.com).

<img width="1114" height="910" alt="conversation-tree-visualizer" src="https://github.com/user-attachments/assets/ca3a0a0d-33a2-4924-bda3-07a9f8ee9ec8" />

## How to run
Unfortunately, using ES6 modules means that it won't work out of the box by just opening `index.html` (it's all CORS fault!). So you'll need to run this on a webserver. You can get one with Python like so:
1. Get [Python](https://www.python.org/downloads/).
2. Clone this repository.
3. `cd` to the repository directory.
4. Run `python3 -m http.server`.
