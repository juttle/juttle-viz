require('chai').should();
var MarkdownView = require('../../src/views/markdown');
var viewTestUtils = require('./utils/view-test-utils');

describe('Markdown View', function () {
    it('renders markdown', function() {
        var view = new MarkdownView({
            params: {
                field: 'myMarkdownField'
            }
        });

        view.consume([ { myMarkdownField: '#what\n## yes\n*woohoo*' } ]);

        view.el.innerHTML.should.contain('woohoo');
        view.el.innerHTML.should.not.contain('##');
    });

    it('finds field to render if none specified', function() {
        var view = new MarkdownView();

        view.consume([ { time: new Date(0), someField: 'abc' } ]);

        view.el.innerHTML.should.contain('abc');
    });

    it('renders last point', function() {
        var view = new MarkdownView();

        view.consume([ { someField: 'abc' }, { someField: 'def' } ]);

        view.el.innerHTML.should.contain('def');

        view.consume([ { someField: 'ghi' } ]);

        view.el.innerHTML.should.contain('ghi');
    });

    describe('Invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : MarkdownView,
                params : {
                    columnOrder : 'asdf'
                },
                errorPath : 'columnOrder',
                error : {
                    'code' : 'UNKNOWN',
                    'info' : {}
                }
            });
        });

        it('field must be a string', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : MarkdownView,
                params : {
                    field : 1
                },
                errorPath : 'field',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });
    });
});
