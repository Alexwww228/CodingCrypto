class ComplexBlockCipher {
    constructor() {
        this.key = null;
        this.blockSize = 32;
        this.rounds = 3; 
        this.roundKeyCache = new Map(); 
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
        // Предварительно вычисленная таблица для побитовых операций
        this.rotationCache = this._precomputeRotations();
    }

    // Предварительно вычисляем операции циклического сдвига
    _precomputeRotations() {
        const cache = new Array(256);
        for (let round = 0; round < this.rounds; round++) {
            cache[round] = new Array(256);
            const shift = round + 1;
            for (let i = 0; i < 256; i++) {
                cache[round][i] = ((i << shift) | (i >>> (8 - shift))) & 0xFF;
            }
        }
        return cache;
    }

    // Сброс статистики перед новыми операциями
    resetStats() {
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
        // Очищаем кеш ключей при сбросе
        this.roundKeyCache.clear();
    }

    // Генерация ключа
    generateKey() {
        this.resetStats();
        this.stats.timeStart = performance.now();
        this.stats.steps++;
        this.stats.operations.random++;
        
        this.key = new Uint8Array(64);
        crypto.getRandomValues(this.key);
        
        const keyBase64 = btoa(String.fromCharCode(...this.key));
        document.getElementById("keyComplex").innerHTML = `
            <h3>Сгенерированный ключ:</h3>
            <p>${keyBase64}</p>
        `;

        this.stats.timeEnd = performance.now();
        this.stats.memoryUsed = this.key.byteLength;
        this.stats.operations.random += 1;

        document.getElementById("complexStats").innerHTML = `
            <h4>Статистика генерации ключа:</h4>
            <p>Время: ${(this.stats.timeEnd - this.stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${this.stats.memoryUsed} байт</p>
            <p>Операции: ${this.stats.operations.random}</p>
        `;
    }

    // Генерация ключей для раундов с кешированием
    generateRoundKeys(key, blockIndex, round) {
        // Создаем уникальный ключ для кеширования
        const cacheKey = `${blockIndex}_${round}`;
        
        // Проверяем, есть ли ключ в кеше
        if (this.roundKeyCache.has(cacheKey)) {
            return this.roundKeyCache.get(cacheKey);
        }
        
        // Если ключа нет в кеше, генерируем новый
        const keys = new Uint32Array(4);
        for (let i = 0; i < 4; i++) {
            this.stats.steps++;
            this.stats.operations.bitwise += 2;
            this.stats.operations.arithmetic += 2;
            
            // Оптимизация: сокращаем логику для ускорения
            const keyIndex = (i + blockIndex + round) % key.length;
            const shift = (i + round) % 8;
            keys[i] = Math.imul(key[i % key.length], (0xDEADBEEF >>> (i + round))) ^ 
                     (key[keyIndex] << shift);
        }
        
        // Кешируем сгенерированные ключи
        if (this.roundKeyCache.size < 1000) { // Ограничиваем кеш для экономии памяти
            this.roundKeyCache.set(cacheKey, keys);
        }
        
        return keys;
    }

    // Прямое преобразование блока (оптимизированное)
    transformBlock(block, key, blockIndex) {
        const state = new Uint8Array(block);
        const result = new Uint8Array(this.blockSize);
        const blockMask = blockIndex & 0xFF;
        
        // Однопроходная обработка для уменьшения числа циклов
        for (let round = 0; round < this.rounds; round++) {
            const roundKeys = this.generateRoundKeys(key, blockIndex, round);
            
            // Обрабатываем блок за один проход
            for (let i = 0; i < this.blockSize; i++) {
                this.stats.steps += 3;
                const currentByte = (round === 0) ? state[i] : result[i];
                
                // Слой 1: Нелинейное преобразование
                let val = (currentByte * 17 + (roundKeys[i % 4] & 0xFF)) & 0xFF;
                
                // Слой 2: Побитовые операции с использованием кеша
                val = val ^ ((roundKeys[(i + 1) % 4] >>> 8) & 0xFF);
                val = this.rotationCache[round][val]; // Используем предвычисленные значения
                
                // Слой 3: Зависимость от позиции
                val = ((val + blockMask) & 0xFF) ^ (key[(i + round) % key.length]);
                
                result[i] = val;
            }
        }
        
        return result;
    }

    // Обратное преобразование блока (оптимизированное)
    inverseTransformBlock(block, key, blockIndex) {
        const state = new Uint8Array(block);
        const result = new Uint8Array(this.blockSize);
        const blockMask = blockIndex & 0xFF;
        
        // Копируем исходный блок
        result.set(state);
        
        // Обратная обработка блока
        for (let round = this.rounds - 1; round >= 0; round--) {
            const roundKeys = this.generateRoundKeys(key, blockIndex, round);
            
            // Обрабатываем все байты блока
            for (let i = 0; i < this.blockSize; i++) {
                this.stats.steps += 3;
                
                // Обратный слой 3
                let val = result[i] ^ (key[(i + round) % key.length]);
                val = (val - blockMask + 256) & 0xFF;
                
                // Обратный слой 2 (обратная ротация без деления и умножения)
                const shift = round + 1;
                val = ((val >>> shift) | (val << (8 - shift))) & 0xFF;
                val = val ^ ((roundKeys[(i + 1) % 4] >>> 8) & 0xFF);
                
                // Обратный слой 1 (используем умножение вместо деления)
                val = (((val - (roundKeys[i % 4] & 0xFF) + 256) & 0xFF) * 241) & 0xFF;
                
                result[i] = val;
            }
        }
        
        return result;
    }

    // Быстрое разделение на блоки с правильным дополнением
    splitIntoBlocks(bytes) {
        const blocksCount = Math.ceil(bytes.length / this.blockSize);
        const blocks = new Array(blocksCount);
        
        // Обрабатываем полные блоки
        for (let i = 0, blockIndex = 0; i < bytes.length; i += this.blockSize, blockIndex++) {
            this.stats.steps++;
            
            const remainingBytes = Math.min(this.blockSize, bytes.length - i);
            const block = new Uint8Array(this.blockSize);
            
            // Копируем данные в блок
            for (let j = 0; j < remainingBytes; j++) {
                block[j] = bytes[i + j];
            }
            
            // Если блок неполный, добавляем padding
            if (remainingBytes < this.blockSize) {
                const paddingSize = this.blockSize - remainingBytes;
                for (let j = 0; j < paddingSize; j++) {
                    block[remainingBytes + j] = paddingSize;
                }
            }
            
            blocks[blockIndex] = block;
        }
        
        return blocks;
    }

    // Вычисление контрольной суммы с использованием XOR и сдвига
    fastChecksum(data) {
        let checksum = 0;
        
        if (data instanceof Uint8Array) {
            const len = data.length;
            const step = 4; // Обрабатываем по 4 байта для ускорения
            
            // Проверяем, есть ли у нас хотя бы 4 байта для основной обработки
            if (len >= step) {
                // Обрабатываем данные блоками по 4 байта, учитывая возможную неравномерность массива
                for (let i = 0; i < len - (len % step); i += step) {
                    // Битовая сборка значения из 4 байтов с учетом смещения
                    if (i + 3 < len) {
                        checksum = (checksum + ((data[i] << 24) | (data[i+1] << 16) | (data[i+2] << 8) | data[i+3])) >>> 0;
                    }
                    this.stats.steps++;
                }
            }
            
            // Обрабатываем оставшиеся байты
            for (let i = len - (len % step); i < len; i++) {
                checksum = (checksum + (data[i] << ((len - 1 - i) * 8))) >>> 0;
                this.stats.steps++;
            }
        } 
        else if (Array.isArray(data)) {
            // Для массива блоков создаем единый массив и вычисляем контрольную сумму
            const totalLength = data.reduce((sum, block) => sum + block.length, 0);
            const combinedData = new Uint8Array(totalLength);
            let offset = 0;
            
            for (let i = 0; i < data.length; i++) {
                combinedData.set(data[i], offset);
                offset += data[i].length;
            }
            
            return this.fastChecksum(combinedData);
        }
        
        // Завершающий шаг для улучшения распределения битов (FNV-1a подобный алгоритм)
        checksum = ((checksum ^ (checksum >>> 16)) * 0x85ebca6b) >>> 0;
        checksum = ((checksum ^ (checksum >>> 13)) * 0xc2b2ae35) >>> 0;
        checksum = (checksum ^ (checksum >>> 16)) >>> 0;
        
        return checksum;
    }

    // Объединение блоков и добавление контрольной суммы
    combineBlocks(blocks) {
        // Находим общую длину данных
        const dataLength = blocks.reduce((total, block) => total + block.length, 0);
        const result = new Uint8Array(dataLength + 4); // +4 для контрольной суммы
        
        // Копируем блоки в результирующий массив
        let offset = 0;
        for (let i = 0; i < blocks.length; i++) {
            this.stats.steps++;
            const block = blocks[i];
            result.set(block, offset);
            offset += block.length;
        }
        
        // Извлекаем данные без padding для контрольной суммы
        const dataForChecksum = this.removePadding(blocks);
        
        // Вычисляем контрольную сумму
        const checksum = this.fastChecksum(dataForChecksum);
        
        // Добавляем контрольную сумму в конец массива
        const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
        view.setUint32(offset, checksum, true); // Little-endian
        
        return result;
    }

    // Удаление padding из блоков данных
    removePadding(blocks) {
        // Проверка на пустые данные или некорректный формат
        if (!blocks || !blocks.length) {
            return new Uint8Array(0);
        }
        
        // Копируем блоки, кроме последнего
        const processedBlocks = blocks.slice(0, -1);
        const lastBlock = blocks[blocks.length - 1];
        
        // Проверка на корректность последнего блока
        if (!lastBlock || lastBlock.length !== this.blockSize) {
            // Если последний блок неполный или отсутствует, возвращаем все блоки как есть
            return this._combinePaddedBlocks(blocks);
        }
        
        // Проверяем последний байт в последнем блоке для определения размера padding
        const paddingSize = lastBlock[this.blockSize - 1];
        
        // Проверяем валидность padding
        if (paddingSize > 0 && paddingSize <= this.blockSize) {
            // Дополнительная проверка: все байты padding должны иметь одинаковое значение
            let isPaddingValid = true;
            for (let i = this.blockSize - paddingSize; i < this.blockSize; i++) {
                if (lastBlock[i] !== paddingSize) {
                    isPaddingValid = false;
                    break;
                }
            }
            
            if (isPaddingValid) {
                // Копируем часть последнего блока без padding
                const processedLastBlock = lastBlock.slice(0, this.blockSize - paddingSize);
                processedBlocks.push(processedLastBlock);
            } else {
                // Если padding некорректный, сохраняем блок как есть
                processedBlocks.push(lastBlock);
            }
        } else {
            // Если padding некорректный, сохраняем блок как есть
            processedBlocks.push(lastBlock);
        }
        
        // Вычисляем общую длину данных
        const totalLength = processedBlocks.reduce((total, block) => total + block.length, 0);
        const result = new Uint8Array(totalLength);
        
        // Копируем все блоки в результирующий массив
        let offset = 0;
        for (let i = 0; i < processedBlocks.length; i++) {
            this.stats.steps++;
            const block = processedBlocks[i];
            result.set(block, offset);
            offset += block.length;
        }
        
        return result;
    }
    
    // Вспомогательный метод для объединения блоков без удаления padding
    _combinePaddedBlocks(blocks) {
        const totalLength = blocks.reduce((total, block) => total + block.length, 0);
        const result = new Uint8Array(totalLength);
        
        let offset = 0;
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            result.set(block, offset);
            offset += block.length;
        }
        
        return result;
    }

    // Шифрование данных
    encrypt(inputBuffer) {
        if (!this.key) {
            alert("Сначала сгенерируйте ключ!");
            throw new Error("Key not generated");
        }
        
        this.resetStats();
        this.stats.timeStart = performance.now();
        
        try {
            const bytes = new Uint8Array(inputBuffer);
            
            // Разбиваем данные на блоки
            const blocks = this.splitIntoBlocks(bytes);
            const encryptedBlocks = new Array(blocks.length);
            
            // Шифруем каждый блок
            for (let i = 0; i < blocks.length; i++) {
                this.stats.steps++;
                encryptedBlocks[i] = this.transformBlock(blocks[i], this.key, i);
            }
            
            // Объединяем блоки и добавляем контрольную сумму
            const result = this.combineBlocks(encryptedBlocks);
            
            this.stats.timeEnd = performance.now();
            this.stats.memoryUsed = result.length;
            
            document.getElementById("complexStats").innerHTML = `
                <h4>Статистика шифрования:</h4>
                <p>Время: ${(this.stats.timeEnd - this.stats.timeStart).toFixed(2)}ms</p>
                <p>Память: ${this.stats.memoryUsed} байт</p>
                <p>Операции: ${this.stats.steps}</p>
                <p>Размер исходных данных: ${bytes.length} байт</p>
                <p>Размер зашифрованных данных: ${result.length} байт</p>
                <p>Скорость: ${Math.round(bytes.length / ((this.stats.timeEnd - this.stats.timeStart) / 1000) / 1024)} КБ/сек</p>
            `;
            
            // Экспортируем статистику для сравнения алгоритмов
            this.logStats();
            
            return result;
        } catch (error) {
            console.error("Ошибка при шифровании:", error);
            throw error;
        }
    }

    // Расшифровка данных
    decrypt(inputBuffer) {
        if (!this.key) {
            alert("Сначала сгенерируйте ключ!");
            throw new Error("Key not generated");
        }
        
        this.resetStats();
        this.stats.timeStart = performance.now();
        
        try {
            const encryptedBytes = new Uint8Array(inputBuffer);
            
            // Проверяем, что у нас есть хотя бы 4 байта для контрольной суммы
            if (encryptedBytes.length < 4) {
                throw new Error("Некорректный формат зашифрованных данных");
            }
            
            // Извлекаем контрольную сумму из последних 4 байт
            const checksum = new DataView(encryptedBytes.buffer, encryptedBytes.byteOffset, encryptedBytes.byteLength).getUint32(encryptedBytes.length - 4, true);
            
            // Удаляем контрольную сумму из данных
            const encryptedDataWithoutChecksum = encryptedBytes.slice(0, encryptedBytes.length - 4);
            
            // Разбиваем на блоки
            const encryptedBlocks = [];
            for (let i = 0; i < encryptedDataWithoutChecksum.length; i += this.blockSize) {
                this.stats.steps++;
                encryptedBlocks.push(encryptedDataWithoutChecksum.slice(i, i + this.blockSize));
            }
            
            // Расшифровываем блоки
            const decryptedBlocks = new Array(encryptedBlocks.length);
            for (let i = 0; i < encryptedBlocks.length; i++) {
                this.stats.steps++;
                decryptedBlocks[i] = this.inverseTransformBlock(encryptedBlocks[i], this.key, i);
            }
            
            // Удаляем padding и получаем финальные данные
            const finalData = this.removePadding(decryptedBlocks);
            
            // Вычисляем контрольную сумму финальных данных
            const computedChecksum = this.fastChecksum(finalData);
            const checksumMatch = computedChecksum === checksum;
            
            this.stats.timeEnd = performance.now();
            this.stats.memoryUsed = finalData.length;
            
            document.getElementById("complexStats").innerHTML = `
                <h4>Статистика расшифровки:</h4>
                <p>Время: ${(this.stats.timeEnd - this.stats.timeStart).toFixed(2)}ms</p>
                <p>Память: ${this.stats.memoryUsed} байт</p>
                <p>Операции: ${this.stats.steps}</p>
                <p>Размер зашифрованных данных: ${encryptedBytes.length} байт</p>
                <p>Размер расшифрованных данных: ${finalData.length} байт</p>
                <p>Контрольная сумма: ${checksumMatch ? "верна" : "не совпадает!"}</p>
                <p>Скорость: ${Math.round(finalData.length / ((this.stats.timeEnd - this.stats.timeStart) / 1000) / 1024)} КБ/сек</p>
            `;
            
            // Экспортируем статистику для сравнения алгоритмов
            this.logStats();
            
            return finalData;
        } catch (error) {
            console.error("Ошибка при расшифровке:", error);
            alert("Ошибка при расшифровке. Проверьте правильность ключа и целостность файла.");
            throw error;
        }
    }

    logStats() {
        console.log({
            executionTime: `${(this.stats.timeEnd - this.stats.timeStart).toFixed(2)}ms`,
            totalSteps: this.stats.steps,
            memoryUsed: `${this.stats.memoryUsed} bytes`,
            operations: this.stats.operations
        });
        
        // Экспортируем статистику для сравнения алгоритмов
        window.complexStats = {
            timeStart: this.stats.timeStart,
            timeEnd: this.stats.timeEnd,
            steps: this.stats.steps,
            memoryUsed: this.stats.memoryUsed,
            operations: this.stats.operations
        };
    }
}

const cipher = new ComplexBlockCipher();

function generateComplexKey() {
    cipher.generateKey();
}

function encryptComplex() {
    const file = document.getElementById("fileToEncryptComplex").files[0];
    if (!file) {
        alert("Выберите файл для шифрования!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const encryptedData = cipher.encrypt(event.target.result);
            const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
            const url = URL.createObjectURL(encryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "enComplex_" + file.name;
            link.click();
        } catch (error) {
            console.error("Ошибка при шифровании:", error);
            alert("Ошибка при шифровании: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function decryptComplex() {
    const file = document.getElementById("fileToDecryptComplex").files[0];
    if (!file) {
        alert("Выберите файл для расшифровки!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const decryptedData = cipher.decrypt(event.target.result);
            const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
            const url = URL.createObjectURL(decryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "deComplex_" + file.name.replace(/^enComplex_/, "");
            link.click();
        } catch (error) {
            console.error("Ошибка при расшифровке:", error);
            alert("Ошибка при расшифровке: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}