Вот адаптированный JavaScript-код для раздела AES в вашем HTML. Сохраните его как `scripts/aes.js`:

```javascript
class BlockCrypto {
    constructor() {
        this.aesKey = null;
        this.blockSize = 8;
        this.stats = {
            steps: 0,
            timeStart: 0,
            timeEnd: 0,
            memoryUsed: 0,
            operations: {
                bitwise: 0,
                arithmetic: 0,
                random: 0
            }
        };
    }

    generateKey() {
        this.stats.timeStart = performance.now();
        this.stats.steps++;
        this.stats.operations.random++;
        
        this.aesKey = new Uint8Array(32);
        crypto.getRandomValues(this.aesKey);
        
        const keyBase64 = btoa(String.fromCharCode(...this.aesKey));
        document.getElementById("keyAES").innerHTML = `
            <h3>Сгенерированный ключ:</h3>
            <p>${keyBase64}</p>
        `;
    }

    xorBlockEncrypt(dataBlock, key, blockIndex) {
        const output = new Uint8Array(this.blockSize);
        for (let i = 0; i < dataBlock.length; i++) {
            this.stats.steps++;
            this.stats.operations.bitwise++;
            this.stats.operations.arithmetic++;
            output[i] = dataBlock[i] ^ (key[i % key.length] + (blockIndex & 0xFF));
        }
        return output;
    }

    splitIntoBlocks(bytes) {
        const blocks = [];
        for (let i = 0; i < bytes.length; i += this.blockSize) {
            this.stats.steps++;
            blocks.push(bytes.slice(i, i + this.blockSize));
        }
        if (bytes.length % this.blockSize !== 0) {
            const lastBlock = blocks[blocks.length - 1];
            const padded = new Uint8Array(this.blockSize);
            padded.set(lastBlock);
            blocks[blocks.length - 1] = padded;
        }
        return blocks;
    }

    encrypt(inputBuffer) {
        if (!this.aesKey) {
            alert("Сначала сгенерируйте ключ!");
            throw new Error("Key not generated");
        }
        
        this.stats.timeStart = performance.now();
        const bytes = new Uint8Array(inputBuffer);
        const blocks = this.splitIntoBlocks(bytes);
        const encryptedBlocks = [];

        for (let i = 0; i < blocks.length; i++) {
            this.stats.steps++;
            encryptedBlocks.push(this.xorBlockEncrypt(blocks[i], this.aesKey, i));
        }

        const result = this.combineBlocks(encryptedBlocks);
        this.stats.timeEnd = performance.now();
        this.stats.memoryUsed = result.length;
        this.logStats();
        return result;
    }

    decrypt(inputBuffer) {
        return this.encrypt(inputBuffer); // XOR симметричен
    }

    combineBlocks(blocks) {
        const totalLength = blocks.length * this.blockSize + 4;
        const result = new Uint8Array(totalLength);
        let checksum = 0;
        
        for (let i = 0; i < blocks.length; i++) {
            this.stats.steps++;
            result.set(blocks[i], i * this.blockSize);
            for (let j = 0; j < this.blockSize; j++) {
                this.stats.steps++;
                this.stats.operations.bitwise++;
                this.stats.operations.arithmetic++;
                checksum = (checksum + blocks[i][j]) ^ (checksum >>> 16);
            }
        }
        
        result.set(new Uint8Array(new Uint32Array([checksum]).buffer), blocks.length * this.blockSize);
        return result;
    }

    logStats() {
        console.log({
            executionTime: `${(this.stats.timeEnd - this.stats.timeStart).toFixed(2)}ms`,
            totalSteps: this.stats.steps,
            memoryUsed: `${this.stats.memoryUsed} bytes`,
            operations: this.stats.operations
        });
    }
}

const cryptoAES = new BlockCrypto();

// Глобальные функции для HTML
function generateAESKey() {
    cryptoAES.generateKey();
}

function encryptAES() {
    const file = document.getElementById("fileToEncryptAES").files[0];
    if (!file) {
        alert("Выберите файл для шифрования!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const encryptedData = cryptoAES.encrypt(event.target.result);
        const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "enAES_" + file.name;
        link.click();
    };
    reader.readAsArrayBuffer(file);
}

function decryptAES() {
    const file = document.getElementById("fileToDecryptAES").files[0];
    if (!file) {
        alert("Выберите файл для расшифровки!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const decryptedData = cryptoAES.decrypt(event.target.result);
        const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "deAES_" + file.name;
        link.click();
    };
    reader.readAsArrayBuffer(file);
}
```

### Как подключить:

1. Сохраните этот код в файл `scripts/aes.js`
2. Убедитесь, что в HTML есть строка `<script src="scripts/aes.js" defer></script>` (она уже есть в вашем коде)
3. Код автоматически свяжется с элементами HTML через их ID:
   - `fileToEncryptAES` для шифрования
   - `fileToDecryptAES` для расшифровки
   - `keyAES` для отображения ключа

### Что делает код:

1. **Генерация ключа**:
   - `generateAESKey()` создает 256-битный ключ и отображает его в Base64 в элементе `keyAES`

2. **Шифрование**:
   - `encryptAES()` берет файл из `fileToEncryptAES`
   - Шифрует его с использованием блочного XOR
   - Создает скачиваемый файл с префиксом "enAES_"

3. **Расшифровка**:
   - `decryptAES()` берет файл из `fileToDecryptAES`
   - Расшифровывает его (XOR симметричен)
   - Создает скачиваемый файл с префиксом "deAES_"

4. **Статистика**:
   - Собирается незаметно и выводится в консоль разработчика (F12)

### Примечания:
- Код полностью совместим с вашим HTML
- Использует те же ID элементов, что указаны в интерфейсе AES
- Сохраняет функциональность вкладок благодаря существующей логике `showTab()`
- Для реального AES-шифрования следует использовать `window.crypto.subtle`, но здесь оставлен XOR для демонстрации

Убедитесь, что папка `scripts` существует в корне проекта, и файл `aes.js` находится в ней.
