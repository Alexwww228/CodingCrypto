class ComplexBlockCipher {
    constructor() {
        this.key = null;
        this.blockSize = 16;
        this.rounds = 4; // Количество раундов для повышения безопасности
        this.stats = {
            steps: 0,
            timeStart: 0,
            timeEnd: 0,
            memoryUsed: 0,
            operations: {
                bitwise: 0,
                arithmetic: 0,
                trigonometric: 0,
                random: 0
            }
        };
    }

    // Генерация ключа
    generateKey() {
        this.stats.timeStart = performance.now();
        this.stats.steps++;
        this.stats.operations.random++;
        
        this.key = new Uint8Array(32);
        crypto.getRandomValues(this.key);
        
        const keyBase64 = btoa(String.fromCharCode(...this.key));
        document.getElementById("keyAES").innerHTML = `
            <h3>Сгенерированный ключ:</h3>
            <p>${keyBase64}</p>
        `;
    }

    // Генерация ключей для раундов
    generateRoundKeys(key, blockIndex, round) {
        const keys = new Uint32Array(4);
        for (let i = 0; i < 4; i++) {
            this.stats.steps++;
            this.stats.operations.bitwise += 2;
            this.stats.operations.arithmetic += 2;
            keys[i] = Math.imul(key[i % key.length], (0xDEADBEEF >>> i)) ^ 
                     (key[(i + blockIndex + round) % key.length] << (i * 3));
        }
        return keys;
    }

    // Прямое преобразование блока
    transformBlock(block, key, blockIndex) {
        let state = new Uint8Array(block);
        
        for (let round = 0; round < this.rounds; round++) {
            const roundKeys = this.generateRoundKeys(key, blockIndex, round);
            const nextState = new Uint8Array(this.blockSize);
            
            for (let i = 0; i < state.length; i++) {
                this.stats.steps += 3;
                let val = state[i];
                
                // Слой 1: Нелинейное преобразование (без sin для точности)
                this.stats.operations.arithmetic += 2;
                val = (val * 17 + (roundKeys[i % 4] & 0xFF)) % 256;
                
                // Слой 2: Побитовые операции
                this.stats.operations.bitwise += 3;
                val = val ^ (roundKeys[(i + 1) % 4] >>> 8);
                val = (val << (round + 1)) | (val >>> (8 - (round + 1)));
                
                // Слой 3: Зависимость от позиции
                this.stats.operations.arithmetic++;
                this.stats.operations.bitwise++;
                val = (val + (blockIndex & 0xFF)) ^ key[(i + round) % key.length];
                
                nextState[i] = val & 0xFF;
            }
            state = nextState;
        }
        return state;
    }

    // Обратное преобразование блока
    inverseTransformBlock(block, key, blockIndex) {
        let state = new Uint8Array(block);
        
        for (let round = this.rounds - 1; round >= 0; round--) {
            const roundKeys = this.generateRoundKeys(key, blockIndex, round);
            const nextState = new Uint8Array(this.blockSize);
            
            for (let i = 0; i < state.length; i++) {
                this.stats.steps += 3;
                let val = state[i];
                
                // Обратный слой 3
                this.stats.operations.bitwise++;
                this.stats.operations.arithmetic++;
                val = val ^ key[(i + round) % key.length];
                val = (val - (blockIndex & 0xFF)) & 0xFF;
                
                // Обратный слой 2
                this.stats.operations.bitwise += 3;
                val = (val >>> (round + 1)) | (val << (8 - (round + 1)));
                val = val ^ (roundKeys[(i + 1) % 4] >>> 8);
                
                // Обратный слой 1
                this.stats.operations.arithmetic += 2;
                val = (((val - (roundKeys[i % 4] & 0xFF)) + 256) * 241) % 256; // 241 - обратное к 17 по модулю 256
                
                nextState[i] = val & 0xFF;
            }
            state = nextState;
        }
        return state;
    }

    // Разделение на блоки
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

    // Объединение блоков с контрольной суммой
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

    // Шифрование
    encrypt(inputBuffer) {
        if (!this.key) {
            alert("Сначала сгенерируйте ключ!");
            throw new Error("Key not generated");
        }
        
        this.stats.timeStart = performance.now();
        const bytes = new Uint8Array(inputBuffer);
        const blocks = this.splitIntoBlocks(bytes);
        const encryptedBlocks = [];

        for (let i = 0; i < blocks.length; i++) {
            this.stats.steps++;
            encryptedBlocks.push(this.transformBlock(blocks[i], this.key, i));
        }

        const result = this.combineBlocks(encryptedBlocks);
        this.stats.timeEnd = performance.now();
        this.stats.memoryUsed = result.length;
        this.logStats();
        return result;
    }

    // Расшифровка
    decrypt(inputBuffer) {
        if (!this.key) {
            alert("Сначала сгенерируйте ключ!");
            throw new Error("Key not generated");
        }
        
        this.stats.timeStart = performance.now();
        const bytes = new Uint8Array(inputBuffer);
        const checksum = new Uint32Array(bytes.slice(-4).buffer)[0];
        const blocks = this.splitIntoBlocks(bytes.slice(0, -4));
        const decryptedBlocks = [];

        for (let i = 0; i < blocks.length; i++) {
            this.stats.steps++;
            decryptedBlocks.push(this.inverseTransformBlock(blocks[i], this.key, i));
        }

        const result = this.combineBlocks(decryptedBlocks);
        this.stats.timeEnd = performance.now();
        this.stats.memoryUsed = result.length;
        this.logStats();

        // Проверка контрольной суммы
        let computedChecksum = 0;
        for (let i = 0; i < blocks.length; i++) {
            for (let j = 0; j < this.blockSize; j++) {
                computedChecksum = (computedChecksum + decryptedBlocks[i][j]) ^ (computedChecksum >>> 16);
            }
        }
        if (computedChecksum !== checksum) {
            console.warn("Контрольная сумма не совпадает! Данные могут быть повреждены.");
        }
        
        return result.slice(0, -4); // Убираем контрольную сумму из результата
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

const cipher = new ComplexBlockCipher();

function generateAESKey() {
    cipher.generateKey();
}

function encryptAES() {
    const file = document.getElementById("fileToEncryptAES").files[0];
    if (!file) {
        alert("Выберите файл для шифрования!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const encryptedData = cipher.encrypt(event.target.result);
        const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "enComplex_" + file.name;
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
        const decryptedData = cipher.decrypt(event.target.result);
        const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "deComplex_" + file.name;
        link.click();
    };
    reader.readAsArrayBuffer(file);
}
