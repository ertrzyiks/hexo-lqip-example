var fs = require('fs')


module.exports = {
  getCache: function () {
    var tmp
    try {
      tmp = fs.readFileSync('tmp.json').toString()
    } catch (ex) {
      tmp = '{}'
    }

    return JSON.parse(tmp)
  },

  saveCache: function (cache) {
    fs.writeFileSync('tmp.json', JSON.stringify(cache))
  }
}
