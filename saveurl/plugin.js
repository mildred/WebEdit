CKEDITOR.plugins.add( 'saveurl', {
    icons: 'openurl,saveurl',
    requires: ['ajax'],
    hidpi: true,
    init: function( editor ) {

        /***********************************
        ** Warn before closing the window **
        ***********************************/
        
        window.addEventListener("beforeunload", function (e) {
            if(!editor.checkDirty()) {
                console.log("Editor is clean.");
                return;
            }
            var confirmationMessage = "If you leave this page, you'll loose unsaved changes.";
            console.log(confirmationMessage);
            (e || window.event).returnValue = confirmationMessage;     //Gecko + IE
            return confirmationMessage;                                //Gecko + Webkit, Safari, Chrome etc.
        });
        
        /****************************
        ** Protocol Buffer NameSys **
        ****************************/
        
        function ipnsEntry(o) {
            // https://developers.google.com/protocol-buffers/docs/encoding
            var pb = new Pbf();
            pb.writeBytesField(1, o.value);
            pb.writeBytesField(2, o.signature);
            return pb.finish();
        }
        
        /************
        ** Ed25519 **
        ************/
        
        function signIpnsHash(value, key){
            return ipnsEntry({
                value: value,
                signature: Ed25519.sign(value, key.pub, key.priv)
            });
        }
        
        function generateKey() {
            return Ed25519.create_keypair(Ed25519.create_seed());
        }
        
        function encodeKey(key) {
            return btoa(key.pub) + btoa(key.priv);
        }
        
        function decodeKey(key) {
            return {
                pub:  atob(key.substr(0, 44)),
                priv: atob(key.substr(44)),
            };
        }

        /**************
        ** Auto Save **
        **************/

        var autoSaveDelay = 1000;
        var autoSaveAlready = false;
        var autoSaveEnabled = true;
        var autoSaveKey = editor.config.autosave_SaveKey != null ? editor.config.autosave_SaveKey : 'autosave_' + window.location + "_" + editor.id;
        
        function autoSave() {
            if(!autoSaveEnabled) return {ok: false};
            if(!autoSaveAlready && localStorage.getItem(autoSaveKey)) {
                return {ok: false, msg: "Not Saved: another editor is open"};
            }
            try {
                var compressedJSON = LZString.compressToUTF16(JSON.stringify({ data: editor.getSnapshot(), saveTime: new Date() }));
                autoSaveAlready = true;
                localStorage.setItem(autoSaveKey, compressedJSON);
                return {ok: true};
            } catch(e) {
                return {ok: false};
            }
        }
        
        function autoSaveReset() {
            localStorage.removeItem(autoSaveKey);                                
            editor.resetDirty();
        }
        
        function autoSaveRestore() {
            var data = localStorage.getItem(autoSaveKey);
            if(!data) return

            data = JSON.parse(LZString.decompressFromUTF16(data));
            if(confirm("You have an unsaved document from " + data.saveTime + ".\nOpen it ?")) {
                autoSaveAlready = true;
                editor.loadSnapshot(data.data);
                return
            }
            
            if(confirm("Delete backup of auto-saved document from " + data.saveTime + "?\nIf you say no, auto-save feature will be disable for this session.")) {
                autoSaveReset();
            } else {
                autoSaveEnabled = false;
            }
        }
        
        var dirty = false;
        editor.on('change', function (ev) {
            if(dirty) return;
            if(!editor.checkDirty()) return;
            dirty = true;
            
            showStatus("Not Saved")

            setTimeout(function(){
                var saved = autoSave();
                if(!saved.ok) {
                    showStatus(saved.msg);
                    return;
                }

                dirty = false;
                showStatus("Saved in memory");
            }, autoSaveDelay);
        });
        
        /*******************
        ** Status Message **
        *******************/
        
        editor.on('uiSpace', function (event) {
            if (event.data.space != 'bottom') return;
            event.data.html += '<div class="autoSaveMessage" unselectable="on"><div unselectable="on" class="hidden" id="cke_saveurlMessage_' + editor.name + '"></div></div>';
        }, editor, null, 100);
        
        function showStatus(msg, timeout) {
            var autoSaveMessage = document.getElementById('cke_saveurlMessage_' + editor.name);
            if (autoSaveMessage) {
                autoSaveMessage.className = "show";
                autoSaveMessage.textContent = msg;
                if(timeout) {
                    setTimeout(function() {
                        autoSaveMessage.className = "hidden";
                    }, timeout);
                }
            }

        }
        
        function hideStatus() {
            var autoSaveMessage = document.getElementById('cke_saveurlMessage_' + editor.name);
            if (autoSaveMessage) {
                autoSaveMessage.className = "hidden";
                autoSaveMessage.textContent = "";
            }
        }
        
        /*****************
        ** HTTP Request **
        *****************/
        
        function httpPostName(url, hash, key, cb) {
            var xhr = new XMLHttpRequest();
            xhr.open('Post', url, true);
            xhr.onreadystatechange = httpCallback;
            xhr.setRequestHeader('IPNS', 'Update');
            xhr.setRequestHeader('IPNS-PublicKey', btoa(key.pub));
            xhr.setRequestHeader('IPNS-PublicKey-Type', 'Ed25519');
            xhr.send(signIpnsHash(hash, key));
            
            function httpCallback() {
                if ( xhr.readyState != 4 ) return;
                var ok = (xhr.status >= 200 && xhr.status < 300) ||
                    xhr.status == 304 || xhr.status === 0 || xhr.status == 1223;
                
                var location = xhr.getResponseHeader("Location");
                if(!location) {
                    location = url;
                } else if(location[0] == '/') {
                    location = url.replace(/^(.*[^\/])?\/[^\/].*$/, "$1" + location);
                }
                
                cb(ok, location, xhr);
            }
        }
        
        // opts.url
        // opts.content_type
        // opts.data
        // cb(ok, location, xhr)
        function httpPutFile(opts, cb) {
            var url = opts.url;
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.onreadystatechange = httpCallback;
            xhr.setRequestHeader('Content-Type', opts.content_type);
            xhr.send(opts.data);
            
            function httpCallback() {
                if ( xhr.readyState != 4 ) return;
                var ok = (xhr.status >= 200 && xhr.status < 300) ||
                    xhr.status == 304 || xhr.status === 0 || xhr.status == 1223;
                
                var location = xhr.getResponseHeader("Location");
                if(!location) {
                    location = url;
                } else if(location[0] == '/') {
                    location = url.replace(/^(.*[^\/])?\/[^\/].*$/, "$1" + location);
                }
                
                var ipfshash = xhr.getResponseHeader("IPFS-Hash");
                
                if(ok && opts.key) {
                    httpPostName(location, ipfshash, key, cb);
                } else {
                    cb(ok, location, xhr);
                }
            }
        }

        function httpPutEditor(url, key, cb) {
            httpPutFile({
                url:          url,
                key:          key,
                data:         editor.getData(),
                content_type: 'text/html; charset=UTF-8'
            }, function(ok, location, xhr){
                if(ok) {
                    editor.documentURL = location;
                    if(location != url) {
                        alert("Document saved to a new location:\n" + location);
                    }
                    autoSaveReset();
                    showStatus("Saved at " + location);
                } else {
                    alert("Could not save document:\n" + xhr.responseText);
                }
                cb();
            });
        }
        
        /****************
        ** Open Dialog **
        ****************/

	CKEDITOR.dialog.add( 'openUrl', function( editor ) {
            var dialogDefinition = {
                title: 'Open URL',
                minWidth: 390,
                minHeight: 50,
                contents: [
                    {
                        type: 'hbox',
                        id: 'box',
                        elements: [
                            {
                                type: 'text',
                                id: 'urlId'
                            },
                            {
                                type: 'html',
                                id:   'html',
                                html: ''
                            }
                        ]
                    }
                ],
                buttons: [
                    CKEDITOR.dialog.okButton(editor, {label: "Open"}),
                    CKEDITOR.dialog.cancelButton(editor, {label: "Cancel"})
                ],
                onShow: function(){
                    document.getElementById(this.getContentElement('box', 'html').domId).innerHTML = "";                    this.getContentElement('box', 'urlId').enable();

                },
                onCancel: function() {},
                onOk: function(ev) {
                    // "this" is now a CKEDITOR.dialog object.
                    // Accessing dialog elements:
                    var url = this.getContentElement('box', 'urlId').getValue();
                    document.getElementById(this.getContentElement('box', 'html').domId).innerHTML = "Loading...";
                    this.getContentElement('box', 'urlId').disable();
                    ev.data.hide = false;
                    var dlg = this;
                    CKEDITOR.ajax.load(url, function(data){
                        editor.setData(data);
                        editor.documentURL = url;
                        dlg.hide();
                    });
                }
            };

            return dialogDefinition;
            
        } );
        
        /****************
        ** Save Dialog **
        ****************/

	CKEDITOR.dialog.add( 'saveUrl', function( editor ) {
            return {
                title: 'Save URL',
                minWidth: 390,
                minHeight: 50,
                contents: [
                    {
                        type: 'vbox',
                        id: 'box',
                        elements: [
                            {
                                type: 'text',
                                id: 'urlId'
                            },
                            {
                                type:      'text',
                                id:        'key',
                                label:     'Private Key',
                                'default': ''
                            },
                            {
                                type:      'button',
                                id:        'keyGenerate',
                                label:     'Generate',
                                onClick: function(){
                                    var dlg = this.getDialog();
                                    dlg.getContentElement('box', 'key')
                                        .setValue(encodeKey(generateKey()), true);
                                }
                            },
                            {
                                type: 'html',
                                id:   'html',
                                html: ''
                            }
                        ]
                    }
                ],
                buttons: [
                    CKEDITOR.dialog.okButton(editor, {label: "Save"}),
                    CKEDITOR.dialog.cancelButton(editor, {label: "Cancel"})
                ],
                onShow: function(){
                    this.getContentElement('box', 'urlId').setValue(editor.documentURL, true);
                    this.getContentElement('box', 'urlId').enable();
                    document.getElementById(this.getContentElement('box', 'html').domId).innerHTML = "";
                },
                onCancel: function() {},
                onOk: function(ev) {
                    // "this" is now a CKEDITOR.dialog object.
                    // Accessing dialog elements:
                    var url = this.getContentElement('box', 'urlId').getValue();
                    var key = decodeKey(this.getContentElement('box', 'key').getValue());
                    var dlg = this;
                    this.getContentElement('box', 'urlId').disable();
                    document.getElementById(this.getContentElement('box', 'html').domId).innerHTML = "Saving...";
                    
                    if(!url) {
                        alert("Could not save document:\nURL not specified");
                        return;
                    }
                    
                    ev.data.hide = false;
                    httpPutEditor(url, key, function(){
                        dlg.hide();
                    });
                }
            };
        } );
        
        /*************
        ** Commands **
        *************/
        
        editor.addCommand( 'openUrl', new CKEDITOR.dialogCommand( 'openUrl' ) );
        editor.addCommand( 'saveUrlAs', new CKEDITOR.dialogCommand( 'saveUrl' ) );

        editor.ui.addButton( 'SaveUrlAs', {
            label: 'Save URL',
            command: 'saveUrlAs',
            toolbar: 'document',
            icon: 'saveurl'
        });

        editor.ui.addButton( 'OpenUrl', {
            label: 'Open URL',
            command: 'openUrl',
            toolbar: 'document',
            icon: 'openurl'
        });
        
        /*******************
        ** Initialization **
        *******************/
        
        editor.on('instanceReady', function (ev) {
            CKEDITOR.scriptLoader.load(CKEDITOR.getUrl(CKEDITOR.plugins.getPath('saveurl') + 'js/extensions.min.js'), function(){
                autoSaveRestore();
            });

            editor.window.getFrame().$.contentWindow.addEventListener("keydown", function(e){
                if(e.key == 's' && e.ctrlKey) {
                    editor.execCommand("saveUrlAs");
                    e.preventDefault();
                }
            });
        });
        
    }
});
