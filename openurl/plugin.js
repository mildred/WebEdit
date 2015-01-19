CKEDITOR.plugins.add( 'openurl', {
    icons: 'openurl',
    requires: ['ajax'],
    hidpi: true,
    init: function( editor ) {

	CKEDITOR.dialog.add( 'openUrl', function( editor ) {
            return {
                title: 'Open URL',
                minWidth: 390,
                minHeight: 50,
                contents: [
                    {
                        type: 'hbox',
                        elements: [
                            {
                                type: 'text',
                                id: 'urlId',
                                rows: 4,
                                cols: 40
                            },
                            {
                                type: 'text',
                                id: 'urlId2',
                                rows: 4,
                                cols: 40
                            },
                            {
                                type: 'button',
                                id: 'btnOpen',
                                align: 'left',
                                label: "Open",
                                onClick: function() {
                                    var url = this.getContentElement( 'tab1', 'urlId' ).getValue();
                                    alert(url);
                                }
                            }
                        ]
                    }
                ],
                buttons: [
                    CKEDITOR.dialog.okButton(editor, {label: "Open"}),
                    CKEDITOR.dialog.cancelButton(editor, {label: "Cancel"})
                ],
                onCancel: function() {},
                onOk: function() {
                    // "this" is now a CKEDITOR.dialog object.
                    // Accessing dialog elements:
                    var url = this.getContentElement( 'tab1', 'urlId' ).getValue();
                    CKEDITOR.ajax.load(url, function(data){
                        editor.setData(data);
                    });
                }
            };
            
        } );
        
        editor.addCommand( 'openUrl', new CKEDITOR.dialogCommand( 'openUrl' ) );

        editor.ui.addButton( 'OpenUrl', {
            label: 'Open URL',
            command: 'openUrl',
            toolbar: 'document'
        });
    }
});