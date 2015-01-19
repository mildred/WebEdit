CKEDITOR.plugins.add( 'openurl', {
    icons: 'openurl',
    hidpi: true,
    init: function( editor ) {

	CKEDITOR.dialog.add( 'openUrl', function( editor ) {
            var dialogDefinition = {
                title: 'Open URL',
                minWidth: 390,
                minHeight: 50,
                contents: [
                    {
                        id: 'tab1',
                        label: 'Label',
                        title: 'Title',
                        expand: true,
                        padding: 0,
                        elements: [
                            {
                                type: 'text',
                                id: 'urlId',
                                rows: 4,
                                cols: 40
                            }
                        ]
                    }
                ],
                buttons: [ CKEDITOR.dialog.okButton, CKEDITOR.dialog.cancelButton ],
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

            return dialogDefinition;
            
        } );
        
        editor.addCommand( 'openUrl', new CKEDITOR.dialogCommand( 'openUrl' ) );

        editor.ui.addButton( 'OpenUrl', {
            label: 'Open URL',
            command: 'openUrl',
            toolbar: 'document'
        });
    }
});