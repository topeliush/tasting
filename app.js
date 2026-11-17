/* Viinitasting.com tasting-sovellus. Tilaisuuden sisältö on tilaisuuden omassa index.html-tiedostossa. */

//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));



(function () {
  "use strict";
  var T = window.TASTING;
  var app = document.getElementById("app");
  var TYYPIT = { kuohu: "Kuohuviini", valkoinen: "Valkoviini", rose: "Roséviini", punainen: "Punaviini" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var KEY = "vt-tasting-" + T.id;
  function uusiTila() { return { nimi: "", linja: null, loppu: { v: {}, lukittu: false }, aromit: {}, aloitettu: false, nakyma: 0, vastaukset: {}, lukittu: {}, paljastettu: {}, arviot: {}, muistiinpanot: {} }; }
  var S = store.get(KEY, null) || uusiTila();
  if (!S.loppu) S.loppu = { v: {}, lukittu: false };
  if (!S.aromit) S.aromit = {};
  var jaetut = store.get(KEY + "-jaetut", {});
  var kasin = store.get(KEY + "-kasin", {});
  function tallenna() { store.set(KEY, S); asetaPresence(); }

  function onSokko(w) { return w.sokko !== false; }
  function onAuki(i) { return !onSokko(T.viinit[i]) || !!S.paljastettu[i]; }
  function tyyppi(w, sokkona) {
    var nimi = sokkona ? (w.alkoholiton ? "Alkoholiton" : TYYPIT[w.tyyppi] || "Viini") : (w.tyyppiNimi || TYYPIT[w.tyyppi] || "Viini");
    return '<span class="vt-tyyppi vt-tyyppi--' + esc(w.tyyppi) + (w.alkoholiton ? " vt-tyyppi--alkoholiton" : "") + '">' + esc(nimi) + "</span>";
  }
  function onLinjat() { return T.viinit.some(function (w) { return w.alkoholiton; }) && T.viinit.some(function (w) { return !w.alkoholiton; }); }
  function linjaOf(w) { return w.alkoholiton ? "alkoholiton" : "viini"; }
  function linjanViinit(l) { var a = []; T.viinit.forEach(function (w, i) { if (!onLinjat() || linjaOf(w) === l) a.push(i); }); return a; }
  function omat() { return linjanViinit(S.linja || "viini"); }
  function onOma(i) { return omat().indexOf(i) >= 0; }
  function nro(i) { return onLinjat() ? linjanViinit(linjaOf(T.viinit[i])).indexOf(i) + 1 : i + 1; }
  function sana(w) { return w.alkoholiton ? "juoma" : "viini"; }
  function iso(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // Toisen linjan juoma näytetään yhteenvedossa vasta, kun saman lasin oma juoma on paljastettu.
  function onPisteet(q) { return typeof q.oikea === "number"; }
  function kAvain(i, qi) { return "v" + i + "-" + qi; }
  function lAvain(id, l) { return "L-" + id + "-" + l; }
  function lopuksi() { return T.lopuksi || []; }
  function lyhytNimi(i) { var w = T.viinit[i]; return w.lyhyt || w.nimi; }
  function lVaihtoehdot(l) { return linjanViinit(l).map(function (i) { return "Lasi " + nro(i) + " · " + lyhytNimi(i); }); }
  function lOikea(q, l) { return q.oikea && typeof q.oikea[l] === "number" ? q.oikea[l] : null; }
  function lFakta(q, l) { return (q.fakta && (typeof q.fakta === "string" ? q.fakta : q.fakta[l])) || ""; }
  function aromit(i) { var w = T.viinit[i]; return w.aromit || T.aromit || []; }
  var TAHDET = ["0", "1", "2", "3", "4", "5"];
  function tahtiTeksti(t) { var s = ""; for (var k = 1; k <= 5; k++) s += k <= t ? "★" : "☆"; return s; }
  function keskiarvo(luvut) { var n = summa(luvut), s = 0; (luvut || []).forEach(function (x, o) { s += x * o; }); return n ? s / n : null; }
  function desi(x) { return x.toFixed(1).replace(".", ","); }
  function palkitMoni(vaihtoehdot, luvut, omat) {
    var max = Math.max.apply(null, (luvut || []).concat([1]));
    var rivit = vaihtoehdot.map(function (v, o) { return { v: v, o: o, n: luvut[o] || 0 }; })
      .filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    if (!rivit.length) return '<p class="o-vaimea">Ei vielä vastauksia.</p>';
    return '<ul class="pk">' + rivit.map(function (r) {
      var oma = (omat || []).indexOf(r.o) >= 0;
      return '<li class="' + (oma ? "on-oma" : "") + '"><span class="pk-teksti">' + esc(r.v) + (oma ? "<em>sinä</em>" : "") + '</span><span class="pk-luku">' + r.n +
        '</span><span class="pk-palkki"><i style="width:' + Math.round(100 * r.n / max) + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function keskiarvoLista(indeksit, omat) {
    return '<ul class="o-keskiarvot">' + indeksit.map(function (i) {
      var j = jaetut["t" + i], ka = j ? keskiarvo(j) : null, oma = omat ? S.arviot[i] : null;
      return "<li><span>Lasi " + nro(i) + " · " + esc(lyhytNimi(i)) + (oma != null ? ' <span class="o-vaimea" style="display:inline">(sinä ' + oma + ")</span>" : "") + "</span>" +
        "<b>" + (ka == null ? "–" : "★ " + desi(ka)) + "</b>" +
        '<span class="pk-palkki"><i style="width:' + (ka == null ? 0 : Math.round(ka * 20)) + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function summa(a) { var s = 0; (a || []).forEach(function (n) { s += n; }); return s; }
  function palkit(vaihtoehdot, luvut, oikea, oma) {
    var s = summa(luvut);
    return '<ul class="pk">' + vaihtoehdot.map(function (v, o) {
      var n = luvut[o] || 0, pros = s ? Math.round(100 * n / s) : 0;
      return '<li class="' + (o === oma ? "on-oma " : "") + (o === oikea ? "on-oikea" : "") + '"><span class="pk-teksti">' + (o === oikea ? "✓ " : "") + esc(v) +
        (o === oma ? "<em>sinä</em>" : "") + '</span><span class="pk-luku">' + pros + ' %</span><span class="pk-palkki"><i style="width:' + pros + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function nakyvissa(i) { if (onOma(i)) return onAuki(i); var o = omat()[nro(i) - 1]; return o == null || onAuki(o); }
  function logo(src, cls) { return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="viinitasting.com" onerror="this.remove()">' : ""; }
  function vastaus(i, qi) { var v = S.vastaukset[i]; return v && v[qi] != null ? v[qi] : null; }

  function osallistujaUrl() {
    if (T.osoite) return T.osoite;
    var t = store.get("vt-osoite", "");
    if (t) return t;
    var ylin = true;
    try { ylin = window.top === window.self; } catch (e) { ylin = false; }
    if (ylin && /^https?:$/.test(location.protocol)) return location.origin + location.pathname;
    return "";
  }
  function lyhyt(u) { return u.replace(/^https?:\/\//, "").replace(/\/$/, ""); }

  function qrSvg(text, cls) {
    if (!text || typeof qrcode !== "function") return '<div class="' + cls + ' qr-tyhja">QR-koodi näkyy, kun osoite on asetettu</div>';
    var q = qrcode(0, "M"); q.addData(text); q.make();
    var n = q.getModuleCount(), d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    return '<svg class="' + cls + '" viewBox="-3 -3 ' + (n + 6) + " " + (n + 6) + '" role="img" aria-label="QR-koodi: ' + esc(text) + '"><rect x="-3" y="-3" width="' + (n + 6) + '" height="' + (n + 6) + '" fill="#ffffff"/><path d="' + d + '" fill="#2d2d2a"/></svg>';
  }

  function pisteet() {
    var oikein = 0, yht = 0, kaikki = 0, l = S.linja || "viini";
    lopuksi().forEach(function (q) {
      var o = lOikea(q, l);
      if (o == null) return;
      kaikki++;
      if (!S.loppu.lukittu) return;
      yht++;
      if (S.loppu.v[q.id] === o) oikein++;
    });
    return { oikein: oikein, yht: yht, kaikki: kaikki };
  }

  /* ================= Osallistuja ================= */
  function renderOsallistuja() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "osallistuja";
    if (!S.aloitettu) { app.innerHTML = aloitus(); return; }
    if (S.nakyma !== "loppu" && S.nakyma !== "vertailu" && !onOma(S.nakyma)) S.nakyma = omat()[0];
    if (S.nakyma === "vertailu" && !lopuksi().length) S.nakyma = "loppu";
    var sisalto = S.nakyma === "loppu" ? yhteenveto() : S.nakyma === "vertailu" ? vertailuNakyma() : viiniNakyma(S.nakyma);
    app.innerHTML = '<main class="o-kehys">' + ylapalkki() + sisalto + "</main>";
  }

  function ylapalkki() {
    var tabit = omat().map(function (i) {
      var w = T.viinit[i], valmis = onAuki(i) && onSokko(w);
      return '<li><button class="o-tab' + (valmis ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="' + i + '" aria-current="' + (S.nakyma === i) + '" aria-label="' + iso(sana(w)) + " " + nro(i) + '">' + nro(i) + "</button></li>";
    }).join("");
    if (lopuksi().length) tabit += '<li><button class="o-tab o-tab--loppu' + (S.loppu.lukittu ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="vertailu" aria-current="' + (S.nakyma === "vertailu") + '">Lopuksi</button></li>';
    tabit += '<li><button class="o-tab o-tab--loppu" data-act="siirry" data-v="loppu" aria-current="' + (S.nakyma === "loppu") + '">Yhteenveto</button></li>';
    return '<header class="o-yla">' + logo(T.logo, "logo") + '<span class="o-yla__nimi">' + esc(T.nimi) + "</span></header>" +
      '<nav aria-label="Viinit"><ul class="o-tabit">' + tabit + "</ul></nav>";
  }

  function aloitus() {
    return '<main class="o-kehys"><section class="o-osio" style="padding-top:var(--vali-6)">' +
      logo(T.logo, "logo") +
      '<p class="o-display">tervetuloa</p>' +
      '<div><h1 class="o-h1">' + esc(T.nimi) + '</h1><p class="o-vaimea" style="margin-top:var(--vali-2)">Juontajana ' + esc(T.juontaja) + "</p></div>" +
      '<p class="o-ingressi">' + esc(T.kuvaus) + "</p>" +
      '<div><label class="o-label" for="nimimerkki">Nimimerkki (vapaaehtoinen)</label>' +
      '<input class="o-kentta" id="nimimerkki" autocomplete="nickname" maxlength="30" value="' + esc(S.nimi) + '"></div>' +
      (onLinjat() ? '<div><span class="o-label">Mitä maistat?</span><div class="o-linjat" role="group" aria-label="Mitä maistat?">' +
        '<button class="o-linja" data-act="linja" data-v="viini" aria-pressed="' + (S.linja === "viini") + '">Kuohuviinit<small>' + linjanViinit("viini").length + ' kuohuviiniä</small></button>' +
        '<button class="o-linja o-linja--alk" data-act="linja" data-v="alkoholiton" aria-pressed="' + (S.linja === "alkoholiton") + '">Alkoholittomat<small>' + linjanViinit("alkoholiton").length + ' alkoholitonta</small></button>' +
        "</div></div>" : "") +
      '<button class="vt-painike vt-painike--leveä" data-act="aloita"' + (onLinjat() && !S.linja ? " disabled" : "") + '>Aloita</button>' +
      (onLinjat() && !S.linja ? '<p class="o-vaimea">Valitse ensin kuohuviinit tai alkoholittomat.</p>' : "") +
      (lahjaKaytossa() ? '<p class="o-vaimea">Lopussa odottaa ' + T.lahjakortti.arvo + ' € kiitoslahja.</p>' : "") +
      '<p class="o-vaimea">Ei sovellusta, ei kirjautumista. Aromisi, tähtesi ja loppuvastauksesi lähtevät nimettöminä juontajan yhteenvetoon. Muistiinpanot jäävät vain tähän puhelimeen.</p>' +
      "</section>" +
      (T.naytaJuontajaLinkki ? '<p class="o-alatunniste"><a class="vt-linkki" href="#juontaja">Juontajalle</a></p>' : "") +
      "</main>";
  }

  function maistelu(i) {
    var lukittu = !!S.lukittu[i], valitut = S.aromit[i] || [], t = S.arviot[i];
    var chipit = aromit(i).map(function (a, o) {
      return '<button class="o-aromi" data-act="aromi" data-i="' + i + '" data-o="' + o + '" aria-pressed="' + (valitut.indexOf(o) >= 0) + '"' + (lukittu ? " disabled" : "") + ">" + esc(a) + "</button>";
    }).join("");
    var tahdet = '<button class="o-tahti o-tahti--nolla" data-act="tahti" data-i="' + i + '" data-v="0" aria-pressed="' + (t === 0) + '" aria-label="0 tähteä"' + (lukittu ? " disabled" : "") + ">0</button>";
    for (var k = 1; k <= 5; k++) tahdet += '<button class="o-tahti" data-act="tahti" data-i="' + i + '" data-v="' + k + '" aria-pressed="' + (t != null && k <= t) + '" aria-label="' + k + ' tähteä"' + (lukittu ? " disabled" : "") + ">★</button>";
    return '<fieldset class="o-kysymys"><legend>Mitä aromeja löydät?</legend><p class="o-vaimea" style="clear:both;margin-bottom:var(--vali-3)">Valitse kaikki, jotka löydät.</p><div class="o-aromit">' + chipit + "</div></fieldset>" +
      '<fieldset class="o-kysymys"><legend>Montako tähteä annat?</legend><div class="o-tahdet">' + tahdet + '</div><p class="o-vaimea" style="margin-top:var(--vali-2)">0 = ei maistu, 5 = loistava</p></fieldset>';
  }

  function viiniKortti(w) {
    var tiedot = [["Tuottaja", w.tuottaja], ["Alue", w.alue], ["Maa", w.maa], ["Rypäleet", w.rypaleet]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    return '<article class="vt-kortti o-viini">' + tyyppi(w) +
      '<h2 class="o-viini__nimi">' + esc(w.nimi) + "</h2>" +
      '<dl class="o-tiedot">' + tiedot + "</dl>" +
      (w.tarina ? "<p>" + esc(w.tarina) + "</p>" : "") +
      (w.maistele ? "<h3>Kiinnitä huomiota</h3><p>" + esc(w.maistele) + "</p>" : "") +
      (w.ruoaksi ? "<h3>Ruoaksi</h3><p>" + esc(w.ruoaksi) + "</p>" : "") +
      "</article>";
  }

  function tulos(w, i) {
    var valitut = S.aromit[i] || [], j = jaetut["a" + i], t = S.arviot[i];
    var nimet = valitut.map(function (o) { return aromit(i)[o]; }).filter(Boolean);
    return '<div class="vt-kortti o-havainto"><h2 class="o-h2">Sinun havaintosi</h2>' +
      "<p>Tähdet: <b class=\"o-tahtirivi\">" + tahtiTeksti(t || 0) + "</b> " + (t == null ? "ei annettu" : t + "/5") + "</p>" +
      "<p>Aromit: <b>" + (nimet.length ? esc(nimet.join(", ")) : "ei valittuja") + "</b></p>" +
      (j ? '<div class="o-jakauma"><span class="o-jakauma__otsikko">Koko porukan aromit</span>' + palkitMoni(aromit(i), j, valitut) + "</div>"
         : '<p class="o-vaimea">Koko porukan aromit tulevat tähän, kun juontaja jakaa ne. Tähtien tulokset näytetään lopuksi.</p>') +
      "</div>";
  }

  function arvio(i) {
    return '<div><label class="o-label" for="muistiinpano-' + i + '">Omat muistiinpanot</label>' +
      '<textarea class="o-kentta" id="muistiinpano-' + i + '" data-muistiinpano="' + i + '" placeholder="Mitä maistoit? Ostaisitko tämän?">' + esc(S.muistiinpanot[i] || "") + "</textarea></div>";
  }

  function viiniNakyma(i) {
    var w = T.viinit[i], sokko = onSokko(w);
    var h = '<section class="o-osio"><div class="o-rivi"><span class="vt-pallo">' + nro(i) + "</span>" + tyyppi(w, !onAuki(i)) + "</div>";
    if (!onAuki(i)) {
      h += '<h1 class="o-h1">' + iso(sana(w)) + " " + nro(i) + '</h1><p class="o-ingressi">Haistele ja maistele. Juontaja paljastaa ' + (w.alkoholiton ? "juoman" : "viinin") + ', kun kaikki ovat vastanneet.</p>';
      h += maistelu(i);
      if (!S.lukittu[i]) {
        var valmis = S.arviot[i] != null;
        h += '<button class="vt-painike vt-painike--leveä" data-act="lukitse" data-i="' + i + '"' + (valmis ? "" : " disabled") + ">Lukitse vastaukset</button>";
        if (!valmis) h += '<p class="o-vaimea">Anna tähdet, niin voit lukita vastauksesi.</p>';
      } else if (T.kaytaPaljastussanaa) {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Vastaukset lukittu</span>' +
          "<p>Kun juontaja kertoo paljastussanan, kirjoita se tähän.</p>" +
          '<label class="o-label" for="sana-' + i + '">Paljastussana</label>' +
          '<input class="o-kentta" id="sana-' + i + '" data-sana="' + i + '" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go">' +
          '<p class="o-virhe" id="virhe-' + i + '" role="alert" hidden>Sana ei täsmää. Kuuntele juontajaa ja kokeile uudelleen.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Paljasta viini</button></div>';
      } else {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Vastaukset lukittu</span><p>Avaa viini, kun juontaja paljastaa sen.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Paljasta viini</button></div>';
      }
    } else {
      if (sokko) h += tulos(w, i);
      h += viiniKortti(w) + arvio(i);
      var om = omat(), seur = om[om.indexOf(i) + 1];
      var loppuun = lopuksi().length ? "vertailu" : "loppu";
      h += '<button class="vt-painike vt-painike--leveä" data-act="siirry" data-v="' + (seur == null ? loppuun : seur) + '">' + (seur == null ? (lopuksi().length ? "Lopuksi" : "Yhteenveto") : "Seuraava " + sana(w)) + "</button>";
    }
    return h + "</section>";
  }

  function vertailuNakyma() {
    var l = S.linja || "viini", L = S.loppu, vv = lVaihtoehdot(l);
    var h = '<section class="o-osio"><h1 class="o-h1">Lopuksi</h1>';
    if (!L.lukittu) {
      h += '<p class="o-ingressi">Mieti kaikkia kolmea lasia yhdessä. Voit maistaa vielä uudelleen.</p>';
      h += lopuksi().map(function (q) {
        var napit = vv.map(function (v, o) {
          return '<button class="o-vaihtoehto" data-act="l-valitse" data-id="' + esc(q.id) + '" data-o="' + o + '" aria-pressed="' + (L.v[q.id] === o) + '">' + esc(v) + "</button>";
        }).join("");
        return '<fieldset class="o-kysymys"><legend>' + esc(q.kysymys) + '</legend><div class="o-vaihtoehdot o-vaihtoehdot--yksi">' + napit + "</div></fieldset>";
      }).join("");
      var valmis = lopuksi().every(function (q) { return L.v[q.id] != null; });
      h += '<button class="vt-painike vt-painike--leveä" data-act="l-lukitse"' + (valmis ? "" : " disabled") + ">Lukitse ja katso tulokset</button>";
      if (!valmis) h += '<p class="o-vaimea">Vastaa kaikkiin, niin voit lukita vastaukset.</p>';
    } else {
      var ok = 0, pk = 0, jaettuja = 0;
      var rivit = lopuksi().map(function (q) {
        var v = L.v[q.id], o = lOikea(q, l), j = jaetut[lAvain(q.id, l)], f = lFakta(q, l);
        var r = "<li>" + esc(q.kysymys);
        if (o != null) {
          pk++;
          if (v === o) ok++;
          r += "<b>" + esc(vv[o]) + "</b>" + (v === o ? 'Sinun vastauksesi <span class="o-merkki o-merkki--oikein">Oikein</span>'
            : "Sinun vastauksesi: " + esc(v == null ? "ei vastausta" : vv[v]) + ' <span class="o-merkki o-merkki--vaarin">Väärin</span>');
        } else {
          r += '<b class="o-oma">Sinä: ' + esc(v == null ? "ei vastausta" : vv[v]) + "</b>";
        }
        if (f) r += '<span class="o-fakta">' + esc(f) + "</span>";
        if (j) { jaettuja++; r += '<div class="o-jakauma"><span class="o-jakauma__otsikko">Koko porukka · ' + summa(j) + " vastausta</span>" + palkit(vv, j, o, v) + "</div>"; }
        return r + "</li>";
      }).join("");
      if (pk) h += '<div class="o-tulos"><span class="o-tulos__luku">' + ok + "/" + pk + '</span><span class="o-tulos__teksti">oikein vertailussa</span></div>';
      h += '<ul class="o-vastaukset">' + rivit + "</ul>";
      if (!jaettuja) h += '<p class="o-vaimea">Koko porukan vastaukset tulevat tähän, kun juontaja jakaa ne.</p>';
      if (omat().some(function (i) { return jaetut["t" + i]; })) h += '<div><h2 class="o-h2">Tähtien keskiarvot</h2>' + keskiarvoLista(omat(), true) + "</div>";
    }
    h += '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="siirry" data-v="loppu">Yhteenveto</button>';
    return h + "</section>";
  }
  function jarjestys() {
    if (!onLinjat()) return T.viinit.map(function (w, i) { return i; });
    var muu = S.linja === "alkoholiton" ? "viini" : "alkoholiton";
    return omat().concat(linjanViinit(muu));
  }
  function viinilistaTeksti() {
    var rivit = jarjestys().map(function (i) {
      var w = T.viinit[i];
      if (!nakyvissa(i)) return nro(i) + ". " + iso(sana(w)) + " " + nro(i) + (w.alkoholiton ? " (alkoholiton)" : "") + " (ei paljastettu)";
      var r = nro(i) + ". " + w.nimi + (w.alkoholiton ? " (alkoholiton)" : "") + " – " + [w.alue, w.maa].filter(Boolean).join(", ");
      if (S.arviot[i]) r += "\n   Oma arvio: " + S.arviot[i] + "/5";
      if (S.muistiinpanot[i]) r += "\n   " + S.muistiinpanot[i].replace(/\n/g, " ");
      return r;
    });
    return T.nimi + "\n\n" + rivit.join("\n") + "\n\nViinitasting.com";
  }

  function yhteenveto() {
    var p = pisteet();
    var paras = 0; omat().forEach(function (i) { if (onAuki(i)) paras = Math.max(paras, S.arviot[i] || 0); });
    function rivi(i) {
      var w = T.viinit[i], auki = nakyvissa(i), oma = onOma(i), a = oma ? S.arviot[i] || 0 : 0;
      var merkki = w.alkoholiton ? '<span class="o-alk-merkki">Alkoholiton</span>' : "";
      return "<li" + (w.alkoholiton ? ' class="o-alk"' : "") + '><span class="vt-pallo">' + nro(i) + "</span><div>" +
        (auki ? "<b>" + esc(w.nimi) + "</b>" + merkki + "<span>" + esc([w.alue, w.maa].filter(Boolean).join(", ")) + (oma && S.arviot[i] != null ? " · sinä ★ " + S.arviot[i] : "") + (jaetut["t" + i] && keskiarvo(jaetut["t" + i]) != null ? " · porukka ★ " + desi(keskiarvo(jaetut["t" + i])) : "") + "</span>" +
                (oma && S.muistiinpanot[i] ? "<span>" + esc(S.muistiinpanot[i]) + "</span>" : "") +
                (oma && paras > 0 && a === paras ? '<span class="o-suosikki">Suosikkisi</span>' : "")
              : "<b>" + iso(sana(w)) + " " + nro(i) + "</b>" + merkki + "<span>Ei vielä paljastettu</span>") +
        "</div></li>";
    }
    var lista;
    if (onLinjat()) {
      var muu = S.linja === "alkoholiton" ? "viini" : "alkoholiton";
      var ryhma = function (l, oma) {
        return '<h3 class="o-ryhma' + (l === "alkoholiton" ? " o-ryhma--alk" : "") + '">' + (l === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit") + (oma ? " · sinun lasisi" : "") + "</h3>" +
          '<ul class="o-lista">' + linjanViinit(l).map(rivi).join("") + "</ul>";
      };
      lista = ryhma(S.linja || "viini", true) + ryhma(muu, false);
    } else {
      lista = '<ul class="o-lista">' + T.viinit.map(function (w, i) { return rivi(i); }).join("") + "</ul>";
    }
    var otsikko = S.nimi ? "Kiitos, " + esc(S.nimi) : "Kiitos illasta";
    var h = '<section class="o-osio"><h1 class="o-h1">' + otsikko + "</h1>";
    if (p.kaikki) {
      h += '<div class="o-tulos"><span class="o-tulos__luku">' + p.oikein + "/" + p.kaikki + '</span><span class="o-tulos__teksti">oikein sokkovisassa' +
        (p.yht < p.kaikki ? "<br>" + (p.kaikki - p.yht) + " kysymystä vielä paljastamatta" : "") + "</span></div>";
    }
    var lahja = lahjaKaytossa();
    if (lahja) h += lahjaOsio();
    h += arvioPyynto();
    h += '<div><h2 class="o-h2">' + (onLinjat() ? "Illan juomat" : "Illan viinit") + "</h2>" + lista + "</div>" +
      '<div><button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="kopioi">Kopioi viinilista</button>' +
      '<p class="o-vaimea" id="kopio-tila" role="status" style="margin-top:var(--vali-2)"></p>' +
      '<textarea class="o-kentta o-kopio" id="kopio-teksti" readonly hidden></textarea></div>';
    if (!lahja) {
      h += '<div class="vt-vinkki"><span class="vt-vinkki__nimi">Oma tasting?</span><p style="margin:0 0 var(--vali-4)">' + esc(T.varausTeksti) + "</p>" +
        '<a class="vt-painike vt-painike--leveä" href="' + esc(T.varausLinkki) + '" target="_blank" rel="noopener">Varaa tasting</a></div>';
    }
    h += '<p class="o-alatunniste"><button class="vt-linkki" data-act="tyhjenna" id="tyhjenna">Aloita alusta</button></p>';
    return h + "</section>";
  }

  /* ---------- Kiitoslahja ---------- */
  function lahjaKaytossa() { return !!(T.lahjakortti && T.lahjakortti.kaytossa); }
  function luoLahja() {
    var L = T.lahjakortti, merkit = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", loppu = "";
    var luvut = new Uint8Array(4);
    try { crypto.getRandomValues(luvut); } catch (e) { for (var k = 0; k < 4; k++) luvut[k] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 4; j++) loppu += merkit[luvut[j] % merkit.length];
    var voimassa = new Date(); voimassa.setMonth(voimassa.getMonth() + (L.voimassaKk || 12));
    return { koodi: "VT" + L.arvo + "-" + (L.tunnus || "TASTING").toUpperCase() + "-" + loppu, voimassa: voimassa.toISOString(), valinta: null, kenelle: "", tervehdys: "" };
  }
  function pvm(iso) { var d = new Date(iso); return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear(); }
  function lahjaViesti() {
    var L = T.lahjakortti, l = S.lahja, osoite = lyhyt(T.varausLinkki);
    var tiedot = "Koodi: " + l.koodi + "\nVoimassa " + pvm(l.voimassa) + " asti.\nVaraa: " + osoite;
    if (l.valinta === "itse") return "Viinitasting.com-lahjakortti " + L.arvo + " €\n\n" + tiedot + "\n\nKerro koodi, kun varaat tastingin.";
    var alku = l.kenelle.trim() ? "Hei " + l.kenelle.trim() + "!" : "Hei!";
    var v = alku + " Sain viinitastingissa " + L.arvo + " € lahjakortin ja annan sen sinulle. Saat " + L.arvo +
      " € alennuksen omasta tastingista, jonka Viinitasting.com tuo teidän tiloihinne.\n\n" + tiedot;
    if (l.tervehdys.trim()) v += "\n\n" + l.tervehdys.trim();
    if (S.nimi) v += "\n\n– " + S.nimi;
    return v;
  }
  function jakoLinkit() {
    var teksti = lahjaViesti(), e = encodeURIComponent;
    var aihe = S.lahja.valinta === "itse" ? "Viinitasting.com-lahjakortti" : "Lahjakortti viinitastingiin";
    return { wa: "https://wa.me/?text=" + e(teksti), sms: "sms:?&body=" + e(teksti), mail: "mailto:?subject=" + e(aihe) + "&body=" + e(teksti), teksti: teksti };
  }
  function paivitaJako() {
    var j = jakoLinkit();
    var a = document.getElementById("l-wa"); if (!a) return;
    a.href = j.wa; document.getElementById("l-sms").href = j.sms; document.getElementById("l-mail").href = j.mail;
    document.getElementById("l-esikatselu").textContent = j.teksti;
  }
  function lahjaOsio() {
    var L = T.lahjakortti;
    if (!S.lahja) { S.lahja = luoLahja(); tallenna(); }
    var l = S.lahja;
    var h = '<div class="o-lahja"><span class="o-lahja__nimi">Kiitoslahja</span><span class="o-lahja__summa">' + L.arvo + " €</span>" +
      "<p>Saat " + L.arvo + " € alennuksen omasta tastingista. Käytä se itse tai anna kaverille lahjaksi.</p>" +
      '<div class="o-valinta" role="group" aria-label="Kenelle lahjakortti">' +
      '<button data-act="lahja-valinta" data-v="itse" aria-pressed="' + (l.valinta === "itse") + '">Käytän itse</button>' +
      '<button data-act="lahja-valinta" data-v="lahja" aria-pressed="' + (l.valinta === "lahja") + '">Annan lahjaksi</button></div></div>';
    if (!l.valinta) return h;
    var j = jakoLinkit(), lahjaksi = l.valinta === "lahja";
    h += '<div class="vt-kortti o-koodi" id="lahjakortti"><div><span class="o-koodi__nimi">Lahjakortin koodi</span>' +
      '<span class="o-koodi__koodi">' + esc(l.koodi) + '</span><span class="o-vaimea">Voimassa ' + pvm(l.voimassa) + " asti</span></div>";
    if (lahjaksi) {
      h += '<div><label class="o-label" for="l-kenelle">Kenelle? (etunimi, vapaaehtoinen)</label>' +
        '<input class="o-kentta" id="l-kenelle" data-lahja="kenelle" maxlength="40" autocomplete="off" value="' + esc(l.kenelle) + '"></div>' +
        '<div><label class="o-label" for="l-tervehdys">Oma tervehdys (vapaaehtoinen)</label>' +
        '<textarea class="o-kentta" id="l-tervehdys" data-lahja="tervehdys" maxlength="300" placeholder="Tämä pitää kokea porukalla.">' + esc(l.tervehdys) + "</textarea></div>";
    }
    h += '<h2 class="o-h2" style="font-size:24px">' + (lahjaksi ? "Lähetä lahjakortti" : "Tallenna itsellesi") + "</h2>" +
      '<div class="o-esikatselu" id="l-esikatselu">' + esc(j.teksti) + "</div>" +
      '<div class="o-jaa">' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-wa" href="' + esc(j.wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-sms" href="' + esc(j.sms) + '">Tekstiviesti</a>' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-mail" href="' + esc(j.mail) + '">Sähköposti</a>' +
      '<button class="vt-painike vt-painike--toissijainen vt-painike--pieni" data-act="lahja-kopioi">Kopioi</button></div>' +
      (navigator.share ? '<button class="vt-painike vt-painike--leveä" data-act="lahja-jaa">' + (lahjaksi ? "Lähetä muulla tavalla" : "Jaa muulla tavalla") + "</button>" : "") +
      '<p class="o-vaimea" id="lahja-tila" role="status"></p>' +
      '<textarea class="o-kentta o-kopio" id="lahja-teksti" readonly hidden></textarea>' +
      (lahjaksi ? "" : '<a class="vt-painike vt-painike--leveä" href="' + esc(T.varausLinkki) + '" target="_blank" rel="noopener">Varaa tasting</a>') +
      '<p class="o-ehdot">Voimassa ' + pvm(l.voimassa) + " asti. Yksi lahjakortti tastingvarausta kohden. Kerro koodi varauksen yhteydessä. Ei vaihdeta rahaksi. Myöntäjä " + esc(L.myontaja) + ".</p></div>";
    return h;
  }
  function arvioPyynto() {
    var linkki = T.googleArvioLinkki;
    return '<div class="vt-kortti o-arviopyynto"><h2 class="o-h2">Oliko ilta mieleen?</h2>' +
      "<p>Kerro siitä Googlessa. Arvio auttaa muita löytämään tastingin.</p>" +
      (lahjaKaytossa() ? '<p class="o-vaimea">Kiitoslahja on sinun joka tapauksessa.</p>' : "") +
      (linkki ? '<a class="vt-painike vt-painike--toissijainen vt-painike--leveä" href="' + esc(linkki) + '" target="_blank" rel="noopener">Kirjoita arvio Googleen</a>'
              : '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" disabled>Google-linkki puuttuu</button><p class="o-ehdot">Lisää linkki asetukseen googleArvioLinkki.</p>') +
      "</div>";
  }

  /* ================= Juontaja ================= */
  var dia = store.get(KEY + "-juontaja", 0);
  function diat() {
    var a = [{ k: "kansi" }];
    if (onLinjat()) {
      var V = linjanViinit("viini"), A = linjanViinit("alkoholiton");
      for (var k = 0; k < Math.max(V.length, A.length); k++) {
        var pari = [V[k], A[k]].filter(function (x) { return x != null; });
        if (pari.some(function (i) { return onSokko(T.viinit[i]); })) a.push({ k: "maistelu", lasi: k + 1, pari: pari });
        pari.forEach(function (i) { a.push({ k: "paljastus", i: i }); });
      }
      if (lopuksi().length) { a.push({ k: "vertailu" }); a.push({ k: "vtulos", l: "viini" }); a.push({ k: "vtulos", l: "alkoholiton" }); }
    } else {
      T.viinit.forEach(function (w, i) { if (onSokko(w)) a.push({ k: "maistelu", i: i }); a.push({ k: "paljastus", i: i }); });
      if (lopuksi().length) { a.push({ k: "vertailu" }); a.push({ k: "vtulos", l: "viini" }); }
    }
    a.push({ k: "loppu" });
    return a;
  }

  function diaAvaimet(d) {
    if (!d) return [];
    if (d.k === "paljastus") {
      return [{ avain: "a" + d.i, kysymys: "Mitä aromeja löysit?", vaihtoehdot: aromit(d.i), oikea: null, fakta: "", moni: true }];
    }
    if (d.k === "vtulos") {
      var vv = lVaihtoehdot(d.l);
      return lopuksi().map(function (q) { return { avain: lAvain(q.id, d.l), kysymys: q.kysymys, vaihtoehdot: vv, oikea: lOikea(q, d.l), fakta: lFakta(q, d.l) }; })
        .concat(linjanViinit(d.l).map(function (i) { return { avain: "t" + i, kysymys: "★ Lasi " + nro(i) + " · " + lyhytNimi(i), vaihtoehdot: TAHDET, oikea: null, fakta: "", tahdet: true }; }));
    }
    return [];
  }
  function tulosKortit(d, luokka) {
    var X = diaAvaimet(d), kortit = [];
    X.filter(function (x) { return !x.tahdet; }).forEach(function (x) {
      var j = jaetut[x.avain];
      kortit.push('<div class="j-tulos"><b>' + esc(x.kysymys) + "</b>" +
        (j ? (x.moni ? palkitMoni(x.vaihtoehdot, j, null) : palkit(x.vaihtoehdot, j, x.oikea, null) + '<span class="j-tulos__n">' + summa(j) + " vastausta</span>")
           : x.oikea != null ? '<span class="j-tulos__oikea">✓ ' + esc(x.vaihtoehdot[x.oikea]) + "</span>"
           : '<span class="j-tulos__odota">Tulokset tulevat, kun juontaja jakaa ne.</span>') +
        (x.fakta ? '<span class="j-tulos__fakta">' + esc(x.fakta) + "</span>" : "") + "</div>");
    });
    if (d.k === "vtulos") kortit.push('<div class="j-tulos"><b>Tähtien keskiarvot</b>' + keskiarvoLista(linjanViinit(d.l), false) + "</div>");
    return '<div class="j-tulokset' + luokka + '" style="grid-template-columns:repeat(' + kortit.length + ', 1fr)">' + kortit.join("") + "</div>";
  }
  function renderJuontaja() {
    var D = diat();
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var d = D[dia], url = osallistujaUrl(), h = "", luokka = "";
    var teema = store.get("vt-teema", "vaalea");
    document.documentElement.dataset.theme = teema;
    document.body.className = "juontaja";

    if (d.k === "kansi") {
      luokka = " j-lava--kansi";
      h = logo(T.logoValkoinen, "j-logo") +
        '<div class="j-palstat"><div class="j-palsta" style="justify-content:flex-end"><span class="j-ylatunniste">Juontajana ' + esc(T.juontaja) + "</span>" +
        '<p class="j-display" style="margin-top:calc(20 * var(--u))">tervetuloa</p><p class="j-ala">' + esc(T.nimi) + "</p></div>" +
        '<div class="j-palsta j-palsta--kapea" style="align-items:center;justify-content:flex-end">' + qrSvg(url, "j-qr") +
        (url ? '<div class="j-osoite">' + esc(lyhyt(url)) + '</div><div class="j-ala" style="margin-top:calc(8 * var(--u));font-size:calc(34 * var(--u))">Skannaa koodi puhelimella</div>'
             : '<label class="j-asetus">Liitä osallistujien osoite<input id="j-osoite" placeholder="https://…" value=""></label>') +
        "</div></div>";
    } else if (d.k === "maistelu") {
      var lasi = d.pari ? d.lasi : nro(d.i);
      h = '<div class="j-rivi"><span class="j-pallo">' + lasi + '</span><span class="j-ylatunniste">Lasi ' + lasi + "</span></div>" +
        '<h1 class="j-otsikko">Haistele, maistele, anna tähdet</h1><p class="j-ala">Valitse puhelimessa kaikki aromit, jotka löydät, ja anna 0–5 tähteä.</p>' +
        '<div class="j-aromit">' + (T.aromit || []).map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>" +
        (url ? '<div class="j-qr-pieni"><span>Myöhästyitkö?<br>' + esc(lyhyt(url)) + "</span>" + qrSvg(url, "") + "</div>" : "");
    } else if (d.k === "paljastus") {
      var v = T.viinit[d.i];
      var meta = [v.tuottaja, [v.alue, v.maa].filter(Boolean).join(", "), v.rypaleet].filter(Boolean).map(esc).join(" · ");
      h = '<div class="j-otsake"><span class="j-pallo">' + nro(d.i) + '</span><div><h1 class="j-otsikko">' + esc(v.nimi) + "</h1>" +
        '<div class="j-meta">' + tyyppi(v) + "<span>" + meta + "</span></div></div></div>" +
        '<div class="j-tulokset" style="grid-template-columns:1.5fr 1fr">' +
          tulosKortit(d, "").replace(/^<div class="j-tulokset" style="[^"]*">/, "").replace(/<\/div>$/, "") +
          '<div class="j-tulos"><b>Kiinnitä huomiota</b><span class="j-huomio">' + esc(v.maistele) + "</span></div></div>";
    } else if (d.k === "vertailu") {
      h = '<div class="j-rivi"><span class="j-ylatunniste">Lopuksi</span></div>' +
        '<h1 class="j-otsikko">Mieti kaikkia kolmea yhdessä</h1><p class="j-ala">Vastaa puhelimessa kohdassa Lopuksi ja lukitse vastauksesi.</p>' +
        '<ol class="j-kysymykset">' + lopuksi().map(function (q) { return "<li><b>" + esc(q.kysymys) + "</b></li>"; }).join("") + "</ol>";
    } else if (d.k === "vtulos") {
      var alk = d.l === "alkoholiton";
      h = '<div class="j-rivi"><span class="vt-tyyppi vt-tyyppi--kuohu' + (alk ? " vt-tyyppi--alkoholiton" : "") + '">' + (onLinjat() ? (alk ? "Alkoholittomat" : "Kuohuviinit") : "Viinit") + "</span></div>" +
        '<h1 class="j-otsikko" style="font-size:calc(76 * var(--u))">Illan tulokset</h1>' + tulosKortit(d, " j-tulokset--4");
    } else {
      luokka = " j-lava--loppu";
      var vihrea = teema === "ilta" ? T.logo : T.logoValkoinen;
      h = logo(vihrea, "j-logo") + '<div class="j-palstat"><div class="j-palsta">' +
        '<p class="j-display">kiitos</p><p class="j-ala">Yhteenveto, pisteet ja omat muistiinpanot jäävät puhelimeesi.</p>' +
        (lahjaKaytossa() ? '<p class="j-ala">Puhelimessasi odottaa ' + T.lahjakortti.arvo + ' € kiitoslahja. Käytä se itse tai anna kaverille.</p>' : "") +
        '<p class="j-ala" style="font-weight:800">Varaa oma tasting: ' + esc(lyhyt(T.varausLinkki)) + "</p></div></div>";
    }

    app.innerHTML = '<div class="j-kehys"><div class="j-lava' + luokka + '" id="lava">' + h + "</div></div>" +
      '<nav class="j-ohjaus" aria-label="Diojen ohjaus">' +
      '<button data-act="j-ed" aria-label="Edellinen dia">‹</button><span class="j-laskuri">' + (dia + 1) + " / " + D.length + "</span>" +
      '<button data-act="j-seur" aria-label="Seuraava dia">›</button>' +
      '<button data-act="j-teema">' + (teema === "ilta" ? "Vaalea" : "Ilta") + "</button>" +
      '<button data-act="j-koko">Koko näyttö</button>' +
      '<a href="#ohjaus">Puhelinohjaus</a><a href="#poytakortti">Pöytäkortti</a><a href="#">Osallistujan näkymä</a>' +
      '<span id="yhteys" data-luokka="j-chip"></span></nav>';
    skaalaa();
    paivitaYhteys();
  }
  function skaalaa() {
    var lava = document.getElementById("lava");
    if (!lava) return;
    var w = Math.min(window.innerWidth, window.innerHeight * 16 / 9);
    lava.style.setProperty("--u", (w / 1920) + "px");
  }
  function siirraDia(n) { asetaDia(dia + n); }
  function asetaDia(i) {
    var D = diat();
    dia = Math.max(0, Math.min(i, D.length - 1));
    store.set(KEY + "-juontaja", dia);
    laheta(); reitti();
  }
  function vaihdaTeema() {
    store.set("vt-teema", store.get("vt-teema", "vaalea") === "ilta" ? "vaalea" : "ilta");
    laheta(); reitti();
  }

  /* ---------- Puhelin ohjaa näyttöä (room) ---------- */
  var Y = null, kayttaja = null, vastausDocs = [], yhteysTila = "ei", vastausKuuntelu = null;
  var A = window.VT_ASETUKSET || {};
  function onJuontaja() { return !!(kayttaja && !kayttaja.anon && kayttaja.email && (A.juontajat || []).map(function (x) { return String(x).toLowerCase(); }).indexOf(kayttaja.email) >= 0); }
  function juontajaReitti() { return /^(juontaja|ohjaus|naytto)$/.test(location.hash.slice(1)); }
  function juontajaTila() {
    var h = location.hash.slice(1);
    if (h === "ohjaus") return "ohjaus";
    if (h === "naytto") return "naytto";
    return window.innerWidth < 760 ? "ohjaus" : "naytto";
  }
  function laheta() {
    if (!Y || !onJuontaja()) return;
    Y.kirjoitaTila({ dia: dia, teema: store.get("vt-teema", "vaalea"), jaetut: jaetut }).catch(function () { yhteysTila = "virhe"; paivitaYhteys(); });
  }
  var viimeksiLahetetty = "", lahetysAjastin = null;
  function asetaPresence() {
    if (!Y || !kayttaja || juontajaReitti() || !S.aloitettu) return;
    var v = {};
    omat().forEach(function (i) { if (S.lukittu[i]) v["v" + i] = { a: (S.aromit[i] || []).slice(0, 40), t: S.arviot[i] == null ? null : S.arviot[i] }; });
    var data = { l: S.linja || "viini", v: v, L: S.loppu.lukittu ? S.loppu.v : null };
    var s = JSON.stringify(data);
    if (s === viimeksiLahetetty) return;
    clearTimeout(lahetysAjastin);
    lahetysAjastin = setTimeout(function () {
      Y.tallennaVastaus(kayttaja.uid, data).then(function () { viimeksiLahetetty = s; }, function () {});
    }, 500);
  }
  function muut() { return vastausDocs.length; }
  function paivitaYhteys() {
    var el = document.getElementById("yhteys");
    if (!el) return;
    var ok = !!Y && yhteysTila === "yhdistetty", tila = juontajaTila();
    if (tila === "ohjaus") ok = ok && onJuontaja();
    el.className = el.dataset.luokka + (ok ? " on" : "");
    el.textContent = !Y ? "Paikallinen tila" : tila === "ohjaus" ? (ok ? "Yhdistetty · " + vastausDocs.length + " puhelinta" : onJuontaja() ? "Ei yhteyttä" : "Ei kirjautunut") : (ok ? "Yhdistetty" : "Ei yhteyttä");
    var ohje = document.getElementById("yhteys-ohje");
    if (ohje) ohje.hidden = ok;
  }
  function oikeatJaetut(x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    var o = {};
    Object.keys(x).forEach(function (k) {
      if (/^(a\d+|t\d+|L-[\w-]+)$/.test(k) && Array.isArray(x[k]) && x[k].length <= 40 &&
          x[k].every(function (n) { return typeof n === "number" && n >= 0 && n < 100000; })) o[k] = x[k];
    });
    return o;
  }
  var paivitysAjastin = null;
  function paivitaPian() {
    if (paivitysAjastin) return;
    paivitysAjastin = setTimeout(function () {
      paivitysAjastin = null;
      if (juontajaReitti()) { if (juontajaTila() === "ohjaus") renderOhjaus(); return; }
      var a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT")) return;
      if (location.hash.slice(1) !== "poytakortti") renderOsallistuja();
    }, 400);
  }
  function kuunteleVastaukset() {
    if (onJuontaja() && Y && !vastausKuuntelu) {
      vastausKuuntelu = Y.kuunteleVastaukset(function (lista) {
        vastausDocs = lista || [];
        paivitaYhteys();
        if (juontajaReitti() && juontajaTila() === "ohjaus") paivitaPian();
      }, function () { vastausKuuntelu = null; });
    } else if (!onJuontaja() && vastausKuuntelu) { vastausKuuntelu(); vastausKuuntelu = null; vastausDocs = []; }
  }
  function alustaYhteys() {
    if (!window.VTYhteys || !A.firebase || !A.firebase.apiKey) return;
    try { Y = window.VTYhteys(A.firebase, T.id, !!A.emulaattori); } catch (e) { Y = null; return; }
    Y.onKayttaja(function (u) {
      kayttaja = u;
      if (!u && !juontajaReitti()) Y.anonyymi().catch(function () {});
      viimeksiLahetetty = "";
      if (u) asetaPresence();
      kuunteleVastaukset();
      if (juontajaReitti()) reitti();
      paivitaYhteys();
    });
    Y.kuunteleTila(function (d) {
      yhteysTila = "yhdistetty";
      var muuttui = false;
      if (d) {
        if (typeof d.dia === "number" && juontajaReitti()) { dia = Math.max(0, Math.min(d.dia, diat().length - 1)); store.set(KEY + "-juontaja", dia); }
        if (d.teema === "ilta" || d.teema === "vaalea") store.set("vt-teema", d.teema);
        var uudet = oikeatJaetut(d.jaetut || {});
        if (uudet) { muuttui = JSON.stringify(uudet) !== JSON.stringify(jaetut); jaetut = uudet; store.set(KEY + "-jaetut", jaetut); }
      }
      if (juontajaReitti()) reitti(); else if (muuttui) paivitaPian();
      paivitaYhteys();
    }, function () { yhteysTila = "virhe"; paivitaYhteys(); });
  }

  /* ---------- Juontajan puhelinpaneeli ---------- */
  function diaNimi(d) {
    if (!d) return "";
    if (d.k === "kansi") return "Kansi ja QR-koodi";
    if (d.k === "loppu") return "Kiitos ja kiitoslahja";
    if (d.k === "vertailu") return "Lopuksi · kysymykset";
    if (d.k === "vtulos") return "Illan tulokset ja tähdet" + (onLinjat() ? (d.l === "alkoholiton" ? " (alkoholittomat)" : " (kuohuviinit)") : "");
    if (d.pari) return "Lasi " + d.lasi + " · Maistelu";
    var w = T.viinit[d.i];
    var nimi = onLinjat() ? (w.alkoholiton ? "Alkoholiton " : "Kuohuviini ") + nro(d.i) : "Viini " + (d.i + 1);
    if (d.k === "maistelu") return nimi + " · Maistelu";
    return nimi + " · Paljastus ja aromit";
  }
  function muistiinpano(otsikko, teksti) {
    return teksti ? '<div class="p-muisti"><h3>' + otsikko + '</h3><p style="white-space:pre-line">' + esc(teksti) + "</p></div>" : "";
  }
  function puhelinLuvut(avain, n) {
    var a = [], k;
    for (k = 0; k < n; k++) a.push(0);
    var mA = /^a(\d+)$/.exec(avain), mT = /^t(\d+)$/.exec(avain), m2 = /^L-(.+)-(viini|alkoholiton)$/.exec(avain);
    function ok(x) { return typeof x === "number" && x >= 0 && x < n && Math.floor(x) === x; }
    vastausDocs.forEach(function (d) {
      if (!d || typeof d !== "object") return;
      if (mA || mT) {
        var r = d.v && d.v["v" + (mA || mT)[1]];
        if (!r || typeof r !== "object") return;
        if (mA && Array.isArray(r.a)) r.a.filter(function (x, idx, arr) { return ok(x) && arr.indexOf(x) === idx; }).forEach(function (x) { a[x]++; });
        if (mT && ok(r.t)) a[r.t]++;
      } else if (m2 && d.l === m2[2] && d.L && ok(d.L[m2[1]])) a[d.L[m2[1]]]++;
    });
    return a;
  }
  function luvut(avain, n) {
    var p = puhelinLuvut(avain, n), k = kasin[avain] || [];
    return p.map(function (x, o) { return Math.max(0, x + (k[o] || 0)); });
  }
  function laskurit(d) {
    var X = diaAvaimet(d);
    if (!X.length) return "";
    var jaettu = X.some(function (x) { return jaetut[x.avain]; });
    function kortti(x) {
      var n = x.vaihtoehdot.length, p = puhelinLuvut(x.avain, n), L = luvut(x.avain, n), j = jaetut[x.avain];
      return '<div class="p-laskuri"><h3>' + esc(x.kysymys) + "</h3><ul>" + x.vaihtoehdot.map(function (v, o) {
        return '<li class="' + (o === x.oikea ? "on-oikea" : "") + '"><span>' + (o === x.oikea ? "✓ " : "") + (x.tahdet ? "★ " : "") + esc(v) + '</span><span class="p-puh">📱 ' + p[o] + "</span>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="-1" aria-label="Vähennä">−</button><b>' + L[o] + "</b>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="1" aria-label="Lisää">+</button></li>';
      }).join("") + '</ul><span class="p-tila' + (j ? " on" : "") + '">' + (j ? "Jaettu" + (x.moni ? "" : ": " + summa(j) + " vastausta") : "Ei jaettu") +
        (x.tahdet && keskiarvo(L) != null ? " · nyt ★ " + desi(keskiarvo(L)) : "") + "</span></div>";
    }
    var tav = X.filter(function (x) { return !x.tahdet; }), tah = X.filter(function (x) { return x.tahdet; });
    return '<div class="p-muisti"><h3>Vastaukset · ' + (jaettu ? "näkyvät kaikille" : "eivät vielä näy") + "</h3>" +
      '<p class="p-ohje" style="margin:0">📱 = puhelimista tulleet. Lisää käsiäänet + ja − napeilla.</p>' +
      tav.map(kortti).join("") +
      (tah.length ? '<h3 style="margin-top:var(--vali-5)">Tähdet · ' + tah.map(function (x) { var ka = keskiarvo(luvut(x.avain, 6)); return ka == null ? "–" : "★ " + desi(ka); }).join(" · ") + "</h3>" + tah.map(kortti).join("") : "") +
      '<div class="p-jaa"><button class="vt-painike" data-act="p-jaa">' + (jaettu ? "Päivitä kaikille" : "Näytä kaikille") + "</button>" +
      '<button class="vt-painike vt-painike--toissijainen" data-act="p-piilota"' + (jaettu ? "" : " disabled") + ">Piilota</button></div></div>";
  }
  function kirjautuminen() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "ohjaus";
    app.innerHTML = '<main class="o-kehys"><section class="o-osio" style="padding-top:var(--vali-6)">' + logo(T.logo, "logo") +
      '<h1 class="o-h1">Juontajan kirjautuminen</h1><p class="o-vaimea">' + esc(T.nimi) + "</p>" +
      '<div><label class="o-label" for="k-email">Sähköposti</label><input class="o-kentta" id="k-email" type="email" autocomplete="username" value="' + esc((A.juontajat || [])[0] || "") + '"></div>' +
      '<div><label class="o-label" for="k-salasana">Salasana</label><input class="o-kentta" id="k-salasana" type="password" autocomplete="current-password"></div>' +
      '<button class="vt-painike vt-painike--leveä" data-act="p-kirjaudu">Kirjaudu</button>' +
      '<p class="o-virhe" id="k-virhe" role="alert" hidden></p>' +
      '<p class="o-alatunniste"><a class="vt-linkki" href="#naytto">Ison näytön näkymä</a> · <a class="vt-linkki" href="#">Osallistujan näkymä</a></p>' +
      "</section></main>";
  }
  function renderOhjaus() {
    if (Y && !onJuontaja()) { kirjautuminen(); return; }
    var D = diat();
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var d = D[dia], url = osallistujaUrl(), teema = store.get("vt-teema", "vaalea"), h = "";
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "ohjaus";

    if (d.k === "kansi") {
      h = '<h1 class="p-h1">Tervetuloa</h1>' +
        '<div class="p-qr">' + qrSvg(url, "") + "<div>" + (url ? "<b>" + esc(lyhyt(url)) + "</b>" : "<b>Osoite puuttuu</b>") +
        '<button class="vt-painike vt-painike--pieni" data-act="p-iso" data-v="qr">Näytä QR isona</button></div></div>' +
        (url ? "" : '<label class="o-label" for="j-osoite">Osallistujien osoite</label><input class="o-kentta" id="j-osoite" placeholder="https://…">') +
        muistiinpano("Muista", "Pyydä kaikkia skannaamaan koodi ja kirjoittamaan nimimerkki." + (onLinjat() ? " Jokainen valitsee alussa kuohuviinit tai alkoholittomat ja näkee vain omat juomansa." : "") + (lahjaKaytossa() ? " Kerro, että lopussa odottaa kiitoslahja." : ""));
    } else if (d.k === "vertailu") {
      h = '<h1 class="p-h1">Lopuksi</h1>' +
        muistiinpano("Ohje", "Osallistujat vastaavat puhelimessa kohdassa Lopuksi. Seuraavilla dioilla jaat vastaukset ja tähtien keskiarvot.") +
        lopuksi().map(function (q) {
          var t = (onLinjat() ? ["viini", "alkoholiton"] : ["viini"]).map(function (l) {
            var o = lOikea(q, l), vv = lVaihtoehdot(l);
            return (onLinjat() ? (l === "alkoholiton" ? "Alkoholittomat: " : "Kuohuviinit: ") : "") + (o != null ? "✓ " + vv[o] + ". " : "") + lFakta(q, l);
          }).join("\n");
          return muistiinpano(esc(q.kysymys), t);
        }).join("");
    } else if (d.k === "vtulos") {
      h = '<h1 class="p-h1">Illan tulokset' + (onLinjat() ? (d.l === "alkoholiton" ? " · alkoholittomat" : " · kuohuviinit") : "") + "</h1>" + laskurit(d);
    } else if (d.k === "maistelu" && d.pari) {
      h = '<div class="o-rivi"><span class="vt-pallo">' + d.lasi + '</span><span class="p-vaihe">Lasi ' + d.lasi + " · maistelu</span></div>" +
        '<h1 class="p-h1">Haistele, maistele, anna tähdet</h1>' +
        d.pari.map(function (i) {
          var w = T.viinit[i];
          return '<div class="p-muisti">' + tyyppi(w) + '<p style="margin:var(--vali-2) 0 0"><b>' + esc(w.nimi) + "</b></p></div>" +
            muistiinpano("Kiinnitä huomiota", w.maistele) + muistiinpano("Omat muistiinpanot", w.juontajalle);
        }).join("");
    } else if (d.k === "loppu") {
      h = '<h1 class="p-h1">Kiitos ja kiitoslahja</h1>' +
        (lahjaKaytossa() ? muistiinpano("Kiitoslahja", "Jokaisen puhelimessa on nyt " + T.lahjakortti.arvo + " € lahjakortti yhteenvedossa. Sen voi käyttää itse tai antaa kaverille.") : "") +
        muistiinpano("Google-arvio", "Pyydä kaikilta arviota Googleen, ilman palkkiota. Älä yhdistä pyyntöä lahjakorttiin.") +
        muistiinpano("Varaukset", "Oma tasting: " + lyhyt(T.varausLinkki));
    } else {
      var w = T.viinit[d.i], sokko = onSokko(w);
      h = '<div class="o-rivi"><span class="vt-pallo">' + nro(d.i) + "</span>" + tyyppi(w) + "</div>" +
        '<h1 class="p-h1">' + esc(w.nimi) + "</h1>";
      if (sokko && d.k === "paljastus" && T.kaytaPaljastussanaa) {
        h += '<div class="p-sana"><span>Paljastussana</span><b>' + esc(w.paljastussana) + "</b>" +
          '<button class="p-sana__nappi" data-act="p-iso" data-v="sana">Näytä isona</button></div>';
      }
      if (sokko && d.k === "paljastus") h += laskurit(d);
      if (d.k === "maistelu") {
        h += (T.kaytaPaljastussanaa ? '<p class="o-vaimea">Paljastussana seuraavassa vaiheessa: <b>' + esc(w.paljastussana) + "</b></p>" : "") +
          muistiinpano("Kiinnitä huomiota", w.maistele) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      } else {
        h += muistiinpano("Tarina", w.tarina) + muistiinpano("Kiinnitä huomiota", w.maistele) +
          muistiinpano("Ruoaksi", w.ruoaksi) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      }
    }

    var ohjelma = D.map(function (x, k) {
      return '<li><button data-act="p-hyppaa" data-v="' + k + '" aria-current="' + (k === dia) + '"><span>' + (k + 1) + "</span>" + esc(diaNimi(x)) + "</button></li>";
    }).join("");
    var seuraava = D[dia + 1];

    app.innerHTML = '<div class="p-kehys">' +
      '<header class="p-yla"><div><span class="o-ylatunniste">Juontaja</span><span class="p-yla__nimi">' + esc(T.nimi) + "</span></div>" +
      '<span id="yhteys" data-luokka="p-chip"></span></header>' +
      '<p class="p-ohje" id="yhteys-ohje">' + (Y ? "Odotetaan yhteyttä. Iso näyttö seuraa puhelintasi, kun osoite …#naytto on auki läppärillä tai televisiossa." : "Yhteysasetukset puuttuvat, joten sovellus toimii vain tällä laitteella.") + "</p>" +
      '<section class="p-nyt vt-kortti"><span class="p-vaihe">Nyt näytöllä · ' + (dia + 1) + " / " + D.length + "</span>" + h + "</section>" +
      '<details class="p-ohjelma"><summary>Ohjelma</summary><ol>' + ohjelma + "</ol></details>" +
      '<div class="p-asetukset"><button class="vt-painike vt-painike--toissijainen vt-painike--pieni" data-act="j-teema">Näytön teema: ' + (teema === "ilta" ? "Ilta" : "Vaalea") + "</button>" +
      (Y && onJuontaja() ? '<button class="vt-linkki" data-act="p-ulos">Kirjaudu ulos</button>' : "") +
      '<a class="vt-linkki" href="#naytto">Avaa näyttönäkymä</a><a class="vt-linkki" href="#poytakortti">Pöytäkortit</a><a class="vt-linkki" href="#">Osallistujan näkymä</a></div>' +
      "</div>" +
      '<nav class="p-ala" aria-label="Diojen ohjaus"><p>' + (seuraava ? "Seuraavaksi: " + esc(diaNimi(seuraava)) : "Viimeinen dia") + "</p>" +
      '<div class="p-napit"><button class="vt-painike vt-painike--toissijainen" data-act="j-ed"' + (dia === 0 ? " disabled" : "") + ' aria-label="Edellinen dia">‹</button>' +
      '<button class="vt-painike" data-act="j-seur"' + (seuraava ? "" : " disabled") + ">Seuraava ›</button></div></nav>" +
      '<div class="p-iso" id="p-iso" hidden data-act="p-sulje"></div>';
    paivitaYhteys();
  }
  function naytaIsona(mita) {
    var el = document.getElementById("p-iso"), D = diat(), d = D[dia];
    if (!el) return;
    if (mita === "qr") {
      var url = osallistujaUrl();
      el.className = "p-iso p-iso--qr";
      el.innerHTML = qrSvg(url, "") + "<b>" + esc(lyhyt(url)) + "</b><span>Napauta sulkeaksesi</span>";
    } else {
      el.className = "p-iso p-iso--sana";
      el.innerHTML = "<small>Paljastussana</small><b>" + esc(T.viinit[d.i].paljastussana) + "</b><span>Napauta sulkeaksesi</span>";
    }
    el.hidden = false;
  }

  /* ================= Pöytäkortti ================= */
  function renderKortti() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "kortti";
    var url = osallistujaUrl();
    var kortti = '<div class="k-kortti">' + logo(T.logo, "logo") + "<h2>Skannaa ja tule mukaan</h2>" +
      "<p>Viinien tiedot, sokkovisa ja omat muistiinpanot puhelimeesi. Ei sovellusta, ei kirjautumista.</p>" +
      qrSvg(url, "") + (url ? '<div class="k-osoite">' + esc(lyhyt(url)) + "</div>" : "") + "</div>";
    app.innerHTML = '<div class="k-tyokalut"><p>Neljä A6-korttia A4-arkilla. Tulosta paksulle kartongille ja leikkaa katkoviivoja pitkin.' +
      (url ? "" : " Liitä ensin osallistujien osoite juontajan näkymän kanteen.") + "</p>" +
      '<button class="vt-painike" data-act="tulosta">Tulosta</button><a class="vt-linkki" href="#juontaja">Takaisin</a></div>' +
      '<div class="k-sivu">' + kortti + kortti + kortti + kortti + "</div>";
  }

  /* ================= Reititys ja tapahtumat ================= */
  function reitti() {
    var h = location.hash.slice(1);
    edellinenTila = juontajaReitti() ? juontajaTila() : null;
    asetaPresence();
    if (juontajaReitti()) { if (juontajaTila() === "ohjaus") renderOhjaus(); else renderJuontaja(); }
    else if (h === "poytakortti") renderKortti();
    else renderOsallistuja();
  }
  var tyhjennysVarmistus = false;

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.dataset.act, i = t.dataset.i != null ? +t.dataset.i : null;
    switch (act) {
      case "linja":
        var nk = document.getElementById("nimimerkki"); if (nk) S.nimi = (nk.value || "").trim();
        S.linja = t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "aloita":
        if (onLinjat() && !S.linja) return;
        S.nimi = (document.getElementById("nimimerkki").value || "").trim();
        S.aloitettu = true; S.nakyma = omat()[0]; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "siirry":
        S.nakyma = t.dataset.v === "loppu" || t.dataset.v === "vertailu" ? t.dataset.v : +t.dataset.v; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "valitse":
        if (S.lukittu[i]) return;
        S.vastaukset[i] = S.vastaukset[i] || {}; S.vastaukset[i][+t.dataset.q] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "lukitse":
        S.lukittu[i] = true; tallenna(); renderOsallistuja();
        var kentta = document.getElementById("sana-" + i); if (kentta) kentta.scrollIntoView({ block: "center" });
        break;
      case "paljasta": paljasta(i); break;
      case "p-kirjaudu":
        var em = (document.getElementById("k-email").value || "").trim(), pw = document.getElementById("k-salasana").value || "", ve = document.getElementById("k-virhe");
        t.disabled = true; t.textContent = "Kirjaudutaan…";
        Y.kirjaudu(em, pw).then(function () {
          if (!onJuontaja()) { ve.hidden = false; ve.textContent = "Tunnus ei ole juontajan tunnus."; t.disabled = false; t.textContent = "Kirjaudu"; }
        }, function () { ve.hidden = false; ve.textContent = "Kirjautuminen ei onnistunut. Tarkista sähköposti ja salasana."; t.disabled = false; t.textContent = "Kirjaudu"; });
        break;
      case "p-ulos":
        if (Y) Y.ulos().then(reitti); break;
      case "aromi":
        if (S.lukittu[i]) return;
        var va = S.aromit[i] || [], ao = +t.dataset.o, ix = va.indexOf(ao);
        if (ix >= 0) va.splice(ix, 1); else va.push(ao);
        S.aromit[i] = va; tallenna(); renderOsallistuja(); break;
      case "tahti":
        if (S.lukittu[i]) return;
        S.arviot[i] = +t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "l-valitse":
        if (S.loppu.lukittu) return;
        S.loppu.v[t.dataset.id] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "l-lukitse":
        S.loppu.lukittu = true; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "p-kasin":
        var ka = kasin[t.dataset.k] || [], o2 = +t.dataset.o, nyt = luvut(t.dataset.k, 40)[o2] || 0;
        if (+t.dataset.d < 0 && nyt <= 0) return;
        ka[o2] = (ka[o2] || 0) + (+t.dataset.d); kasin[t.dataset.k] = ka; store.set(KEY + "-kasin", kasin); renderOhjaus(); break;
      case "p-jaa":
        diaAvaimet(diat()[dia]).forEach(function (x) { jaetut[x.avain] = luvut(x.avain, x.vaihtoehdot.length); });
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "p-piilota":
        diaAvaimet(diat()[dia]).forEach(function (x) { delete jaetut[x.avain]; });
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "arvio":
        S.arviot[i] = +t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "kopioi": kopioi(viinilistaTeksti(), "kopio-tila", "kopio-teksti", "Viinilista kopioitu. Liitä se vaikka muistiinpanoihin."); break;
      case "lahja-valinta":
        S.lahja.valinta = t.dataset.v; tallenna(); renderOsallistuja();
        var kortti = document.getElementById("lahjakortti"); if (kortti) kortti.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "lahja-kopioi": kopioi(lahjaViesti(), "lahja-tila", "lahja-teksti", "Viesti kopioitu. Liitä se haluamaasi sovellukseen."); break;
      case "lahja-jaa":
        try { navigator.share({ text: lahjaViesti() }).catch(function () {}); } catch (err) {}
        break;
      case "tyhjenna":
        if (!tyhjennysVarmistus) { tyhjennysVarmistus = true; t.textContent = "Varmasti? Vastaukset ja muistiinpanot poistuvat. Paina uudelleen."; return; }
        tyhjennysVarmistus = false; S = uusiTila(); tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "j-ed": siirraDia(-1); break;
      case "j-seur": siirraDia(1); break;
      case "j-teema": vaihdaTeema(); break;
      case "p-hyppaa": asetaDia(+t.dataset.v); window.scrollTo(0, 0); break;
      case "p-iso": naytaIsona(t.dataset.v); break;
      case "p-sulje": t.hidden = true; break;
      case "j-koko":
        try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); } catch (err) {}
        break;
      case "tulosta": try { window.print(); } catch (err) {} break;
    }
  });

  function normalisoi(s) { return String(s || "").trim().toLowerCase(); }
  function paljasta(i) {
    var w = T.viinit[i];
    if (T.kaytaPaljastussanaa) {
      var k = document.getElementById("sana-" + i);
      if (normalisoi(k && k.value) !== normalisoi(w.paljastussana)) {
        var v = document.getElementById("virhe-" + i); if (v) v.hidden = false;
        return;
      }
    }
    S.paljastettu[i] = true; tallenna(); renderOsallistuja(); window.scrollTo(0, 0);
  }

  function kopioi(teksti, tilaId, taId, valmis) {
    var tila = document.getElementById(tilaId);
    function nayta() {
      var ta = document.getElementById(taId);
      ta.value = teksti; ta.hidden = false; ta.focus(); ta.select();
      tila.textContent = "Kopioi teksti tästä kentästä.";
    }
    try {
      navigator.clipboard.writeText(teksti).then(function () { tila.textContent = valmis; }, nayta);
    } catch (e) { nayta(); }
  }

  app.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.muistiinpano != null) { S.muistiinpanot[+t.dataset.muistiinpano] = t.value; tallenna(); }
    if (t.dataset.lahja != null && S.lahja) { S.lahja[t.dataset.lahja] = t.value; tallenna(); paivitaJako(); }
  });
  app.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key === "Enter" && t.dataset.sana != null) { e.preventDefault(); paljasta(+t.dataset.sana); }
    if (e.key === "Enter" && t.id === "nimimerkki") { e.preventDefault(); app.querySelector('[data-act="aloita"]').click(); }
    if (e.key === "Enter" && t.id === "j-osoite") { e.preventDefault(); tallennaOsoite(t.value); }
    if (e.key === "Enter" && t.id === "k-salasana") { e.preventDefault(); app.querySelector('[data-act="p-kirjaudu"]').click(); }
  });
  app.addEventListener("change", function (e) { if (e.target.id === "j-osoite") tallennaOsoite(e.target.value); });
  function tallennaOsoite(v) { v = (v || "").trim(); if (!v) return; if (!/^https?:\/\//.test(v)) v = "https://" + v; store.set("vt-osoite", v); reitti(); }

  document.addEventListener("keydown", function (e) {
    if (!juontajaReitti() || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); siirraDia(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); siirraDia(-1); }
  });
  var edellinenTila = null;
  window.addEventListener("resize", function () {
    if (location.hash === "#juontaja" && juontajaTila() !== edellinenTila) { reitti(); return; }
    skaalaa();
  });
  window.addEventListener("hashchange", function () { reitti(); window.scrollTo(0, 0); });
  reitti();
  alustaYhteys();
})();
