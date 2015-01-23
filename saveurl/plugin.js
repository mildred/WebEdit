CKEDITOR.plugins.add( 'saveurl', {
    icons: 'openurl,saveurl',
    requires: ['ajax'],
    hidpi: true,
    init: function( editor ) {

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
                                }
                                var autoSaveKey = editor.config.autosave_SaveKey != null ? editor.config.autosave_SaveKey : 'autosave_' + window.location + "_" + editor.id;
                                localStorage.removeItem(autoSaveKey);
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
            editor.window.getFrame().$.contentWindow.addEventListener("keydown", function(e){
                if(e.key == 's' && e.ctrlKey) {
                    editor.execCommand("saveUrlAs");
                    e.preventDefault();
                }
            });
        });

    }
});
/*
( function() {
	var saveCmd = {
		readOnly: 1,

		exec: function( editor ) {
			if ( editor.fire( 'save' ) ) {
				var $form = editor.element.$.form;

				if ( $form ) {
					try {
						$form.submit();
					} catch ( e ) {
						// If there's a button named "submit" then the form.submit
						// function is masked and can't be called in IE/FF, so we
						// call the click() method of that button.
						if ( $form.submit.click )
							$form.submit.click();
					}
				}
			}
		}
	};

	// Register a plugin named "allowsave".
	CKEDITOR.plugins.add( 'saveurl', {
		lang: 'af,ar,bg,bn,bs,ca,cs,cy,da,de,el,en,en-au,en-ca,en-gb,eo,es,et,eu,fa,fi,fo,fr,fr-ca,gl,gu,he,hi,hr,hu,id,is,it,ja,ka,km,ko,ku,lt,lv,mk,mn,ms,nb,nl,no,pl,pt,pt-br,ro,ru,si,sk,sl,sq,sr,sr-latn,sv,th,tr,ug,uk,vi,zh,zh-cn', // %REMOVE_LINE_CORE%
		icons: 'saveurl', // %REMOVE_LINE_CORE%
		hidpi: true, // %REMOVE_LINE_CORE%
		init: function( editor ) {
			var command = editor.addCommand( 'save', saveCmd );
			command.modes = { wysiwyg: 1, source: 1 };

			editor.ui.addButton && editor.ui.addButton( 'Save', {
				label: editor.lang.allowsave.toolbar,
				command: 'save',
				toolbar: 'document,10'
			} );
		}
	} );
} )();
*/