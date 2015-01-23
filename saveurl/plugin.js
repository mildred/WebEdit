CKEDITOR.plugins.add( 'saveurl', {
    icons: 'openurl,saveurl',
    requires: ['ajax'],
    hidpi: true,
    init: function( editor ) {

        var autoSaveDelay = 1000;
        var autoSaveAlready = false;
        var autoSaveEnabled = true;
        var autoSaveKey = editor.config.autosave_SaveKey != null ? editor.config.autosave_SaveKey : 'autosave_' + window.location + "_" + editor.id;
        
        function autoSave() {
            if(!autoSaveEnabled) return false;
            if(!autoSaveAlready && localStorage.getItem(autoSaveKey)) {
                console.log("Another editor auto saved before us");
                return false;
            }
            try {
                var compressedJSON = LZString.compressToUTF16(JSON.stringify({ data: editor.getSnapshot(), saveTime: new Date() }));
                autoSaveAlready = true;
                localStorage.setItem(autoSaveKey, compressedJSON);
                return true;
            } catch(e) {
                return false;
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
        
        editor.on('uiSpace', function (event) {
            if (event.data.space != 'bottom') return;
            event.data.html += '<div class="autoSaveMessage" unselectable="on"><div unselectable="on" class="hidden" id="cke_saveurlMessage_' + editor.name + '"></div></div>';
        }, editor, null, 100);

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
                    var dlg = this;
                    this.getContentElement('box', 'urlId').disable();
                    document.getElementById(this.getContentElement('box', 'html').domId).innerHTML = "Saving...";
                    
                    if(!url) {
                        alert("Could not save document:\nURL not specified");
                        return;
                    }
                    
                    ev.data.hide = false;
                    
                    var xhr = new XMLHttpRequest();
                    xhr.open('PUT', url, true);
                    xhr.onreadystatechange = function() {
                        if ( xhr.readyState == 4 ) {
                            if( (xhr.status >= 200 && xhr.status < 300) ||
                                xhr.status == 304 || xhr.status === 0 || xhr.status == 1223 ) {
                                var location = xhr.getResponseHeader("Location");
                                if(location) {
                                    if(location[0] == '/') {
                                        location = document.location.origin + location;
                                    }
                                    if(editor.documentURL != location) {
                                        editor.documentURL = location;
                                        alert("Document saved to a new location:\n" + location);
                                    }
                                } else {
                                    location = url;
                                }
                                autoSaveReset();
                                
                                var autoSaveMessage = document.getElementById('cke_saveurlMessage_' + editor.name);
                                if (autoSaveMessage) {
                                    autoSaveMessage.className = "show";
                                    autoSaveMessage.textContent = "Saved at " + location;
                                    /*setTimeout(function() {
                                        autoSaveMessage.className = "hidden";
                                    }, 2000);*/
                                }
                            } else {
                                alert("Could not save document:\n" + xhr.responseText);
                            }
                            dlg.hide();
                        }
                    };
                    xhr.setRequestHeader('Content-type', 'text/html; charset=UTF-8');
                    xhr.send(editor.getData());
                }
            };
        } );
        
        
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
        
        var dirty = false;
        editor.on('change', function (ev) {
            if(dirty) return;
            if(!editor.checkDirty()) return;
            var autoSaveMessage = document.getElementById('cke_saveurlMessage_' + editor.name);
            dirty = true;
                  
            if (autoSaveMessage) {
                autoSaveMessage.className = "show";
                autoSaveMessage.textContent = "Not Saved";
            }

            setTimeout(function(){
                if(!autoSave()) return;

                dirty = false;
                if (autoSaveMessage) {
                    autoSaveMessage.className = "show";
                    autoSaveMessage.textContent = "Saved in memory";
                }
            }, autoSaveDelay);
        });
        
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

    }
});
