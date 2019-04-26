/* eslint-disable */
const {spawn} = require('child_process')
const fs = require('fs')
const BIN_PATH = require.resolve('lighthouse/lighthouse-cli/index.js')

module.exports = class LightHouseReportManager {
  static generate(paramUrls) {
    const urls = !Array.isArray(paramUrls) ? [paramUrls] : paramUrls;

    const lighthouseReports = urls.map(url => {
      return new Promise((resolve, reject) => {
        const child = spawn(
          "node",
          [
            BIN_PATH,
            url,
            '--output=json',
            '--output=html',
            '--output-path=./report.html',
            '--chrome-flags="--headless"',
          ],
          { stdio: 'inherit' }
        );

        child.on("close", code => {
          const report = fs.readFileSync('report.report.json', 'utf8')
          resolve({ report: JSON.parse(report) });
        });
      })
    })

    return lighthouseReports;
  }

  static parseReport(report, scoreThresholds) {
    const categories = report.report.categories;
    const parsedCategories = Object.keys(categories).reduce((obj, categoryName) => {
      obj[categoryName] = {
        score: categories[categoryName].score * 100,
        scoreThreshold: scoreThresholds[categoryName],
        pass: categories[categoryName].score * 100 >= scoreThresholds[categoryName]
      }
      return obj;
    }, {})

    return {
      url: report.report.finalUrl,
      categories: parsedCategories
    };
  }

  static getMarkDownTable(report, isLowNoise) {
    let table = `
## Lighthouse report for the URL: **${report.url}**
<details opened=${!isLowNoise}>
<summary>Click here to open results 📉</summary>

| Category   | Score | Threshold  | Pass |
| ------------- | ------------- | ------------- | ------------- |
`;
    Object.keys(report.categories).forEach((categoryName, index) => {
      if (index === 0) {
        table += `| ${categoryName}  | ${report.categories[categoryName].score}  | ${report.categories[categoryName].scoreThreshold}  |  ${report.categories[categoryName].pass ? "✅" : "❌"}  |
`;
      } else {
        table += `| ${categoryName}  | ${report.categories[categoryName].score}  | ${report.categories[categoryName].scoreThreshold}  |  ${report.categories[categoryName].pass ? "✅" : "❌"}  |
`;
      }
    });

    table += `
</details>
    `
    table += `<a href="https://circleci.com/api/v1.1/project/github/${
      process.env.CIRCLE_PROJECT_USERNAME
    }/${
      process.env.CIRCLE_PROJECT_REPONAME
    }/${
      process.env.CIRCLE_BUILD_NUM
    }/artifacts/0/home/circleci/project/home/report.report.html">View full lighthouse report</a>`;

    return table;
  }
};
