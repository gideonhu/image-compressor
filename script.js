document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const controls = document.getElementById('controls');
    const resultArea = document.getElementById('resultArea');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const compressBtn = document.getElementById('compressBtn');
    const selectBtn = document.querySelector('.select-btn');

    let selectedFiles = [];

    // 质量滑块更新
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
    });

    // 点击选择按钮
    selectBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // 文件选择处理
    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });

    // 拖拽功能
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(files) {
        selectedFiles = Array.from(files).filter(file =>
            file.type.startsWith('image/')
        );

        if (selectedFiles.length > 0) {
            controls.style.display = 'block';
            updateUploadAreaText();
        }
    }

    function updateUploadAreaText() {
        const uploadContent = uploadArea.querySelector('.upload-content');
        uploadContent.innerHTML = `
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <h3>已选择 ${selectedFiles.length} 个文件</h3>
            <p>点击重新选择或拖拽添加更多文件</p>
            <input type="file" id="fileInput" accept="image/*" multiple>
            <button class="select-btn">重新选择</button>
        `;

        // 重新绑定事件
        const newFileInput = uploadArea.querySelector('#fileInput');
        const newSelectBtn = uploadArea.querySelector('.select-btn');

        newSelectBtn.addEventListener('click', function() {
            newFileInput.click();
        });

        newFileInput.addEventListener('change', function(e) {
            handleFiles(e.target.files);
        });
    }

    // 压缩按钮点击
    compressBtn.addEventListener('click', function() {
        if (selectedFiles.length === 0) {
            alert('请先选择图片文件');
            return;
        }

        compressBtn.textContent = '压缩中...';
        compressBtn.disabled = true;

        setTimeout(() => {
            compressImages();
        }, 100);
    });

    function compressImages() {
        const quality = qualitySlider.value / 100;
        const imageComparison = document.getElementById('imageComparison');
        const downloadArea = document.getElementById('downloadArea');

        imageComparison.innerHTML = '';
        downloadArea.innerHTML = '';

        let processedCount = 0;
        const compressedFiles = [];

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 智能调整尺寸 - 如果图片过大，适当缩小
                    let { width, height } = calculateOptimalSize(img.width, img.height);

                    canvas.width = width;
                    canvas.height = height;

                    // 提高图片质量
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // 绘制图片
                    ctx.drawImage(img, 0, 0, width, height);

                    // 根据文件类型选择压缩格式
                    let mimeType = file.type;
                    if (file.type === 'image/png' && quality < 0.9) {
                        // PNG转为JPEG以获得更好的压缩效果
                        mimeType = 'image/jpeg';
                    }

                    // 压缩
                    canvas.toBlob(function(blob) {
                        processedCount++;

                        // 创建对比显示
                        createComparisonItem(file, blob, img);
                        compressedFiles.push({
                            original: file,
                            compressed: blob,
                            name: getCompressedFileName(file.name, mimeType)
                        });

                        if (processedCount === selectedFiles.length) {
                            createDownloadArea(compressedFiles);
                            compressBtn.textContent = '开始压缩';
                            compressBtn.disabled = false;
                            resultArea.style.display = 'block';
                        }
                    }, mimeType, quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function calculateOptimalSize(originalWidth, originalHeight) {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        const MAX_PIXELS = MAX_WIDTH * MAX_HEIGHT;

        // 如果图片不是很大，保持原尺寸
        if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
            return { width: originalWidth, height: originalHeight };
        }

        // 计算缩放比例
        const ratio = Math.min(
            MAX_WIDTH / originalWidth,
            MAX_HEIGHT / originalHeight,
            Math.sqrt(MAX_PIXELS / (originalWidth * originalHeight))
        );

        return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
        };
    }

    function getCompressedFileName(originalName, mimeType) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        const ext = mimeType === 'image/jpeg' ? '.jpg' :
                   mimeType === 'image/png' ? '.png' :
                   mimeType === 'image/webp' ? '.webp' : '.jpg';
        return nameWithoutExt + '_compressed' + ext;
    }

    function createComparisonItem(originalFile, compressedBlob, img) {
        const imageComparison = document.getElementById('imageComparison');

        const originalItem = document.createElement('div');
        originalItem.className = 'image-item';

        const compressedItem = document.createElement('div');
        compressedItem.className = 'image-item';

        // 原图
        const originalImg = document.createElement('img');
        originalImg.src = URL.createObjectURL(originalFile);
        originalItem.innerHTML = `
            <h4>原图</h4>
            <div class="image-info">
                大小: ${formatFileSize(originalFile.size)}<br>
                尺寸: ${img.width} × ${img.height}
            </div>
        `;
        originalItem.insertBefore(originalImg, originalItem.firstChild.nextSibling);

        // 压缩后
        const compressedImg = document.createElement('img');
        compressedImg.src = URL.createObjectURL(compressedBlob);
        const compressionRatio = ((originalFile.size - compressedBlob.size) / originalFile.size * 100).toFixed(1);
        compressedItem.innerHTML = `
            <h4>压缩后</h4>
            <div class="image-info">
                大小: ${formatFileSize(compressedBlob.size)}<br>
                压缩率: ${compressionRatio}%
            </div>
        `;
        compressedItem.insertBefore(compressedImg, compressedItem.firstChild.nextSibling);

        imageComparison.appendChild(originalItem);
        imageComparison.appendChild(compressedItem);
    }

    function createDownloadArea(compressedFiles) {
        const downloadArea = document.getElementById('downloadArea');

        downloadArea.innerHTML = '<h4>下载压缩后的图片</h4>';

        // 单个文件下载按钮
        compressedFiles.forEach(file => {
            const btn = document.createElement('button');
            btn.className = 'download-btn';
            btn.textContent = `下载 ${file.name}`;
            btn.addEventListener('click', function() {
                downloadFile(file.compressed, file.name);
            });
            downloadArea.appendChild(btn);
        });

        // 批量下载按钮
        if (compressedFiles.length > 1) {
            const zipBtn = document.createElement('button');
            zipBtn.className = 'download-btn';
            zipBtn.textContent = '打包下载全部';
            zipBtn.addEventListener('click', function() {
                // 这里可以集成JSZip库来实现打包下载
                alert('批量下载功能待实现，请单独下载每个文件');
            });
            downloadArea.appendChild(zipBtn);
        }
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed_' + filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});