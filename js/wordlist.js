define(function (require) {

    require("easel");
    require("tween");

    wordlist = {};

    function WordListView(canvas, game) {

        this.canvas = canvas;
        this.game = game;
        this.selectedWord = null;
        this.onAnimation = false;

        this.stage = new createjs.Stage(this.canvas);
        createjs.Ticker.setFPS(10);
        createjs.Ticker.addEventListener("tick", this.stage);

        var shadow_width = 10
        // add a background
        this.background = new createjs.Shape();
        this.background.graphics.beginFill(
            createjs.Graphics.getRGB(0xe0e0e0)
            ).drawRect(
            0, 0, this.canvas.width - shadow_width, this.canvas.height);
        this.stage.addChild(this.background);

        this.rightBorder = new createjs.Shape();
        this.rightBorder.graphics.beginLinearGradientFill(
            ["#aaaaaa", "#ffffff"], [0, 1],
            this.canvas.width - shadow_width, 0,
            this.canvas.width, 0).drawRect(
            this.canvas.width - shadow_width, 0,
            this.canvas.width, this.canvas.height);
        this.stage.addChild(this.rightBorder);

        this.wordHeight = 50;

        this.deleteButton = new createjs.Container();
        this.deleteButtonImg = new createjs.Bitmap("icons/minus.svg");
        this.deleteButton.visible = false;
        this.deleteButton.addChild(this.deleteButtonImg);
        this.stage.addChild(this.deleteButton);

        this.stage.on('click', function (event) {
            if (this.game.started) {
                return;
            };

            if (event.target == this.background) {
                this.deleteButton.visible = false;
                this.selectedWord = null;
            };
        }, this);

        this.deleteButton.on('click', function (event) {
            if (this.game.started) {
                return;
            };

            if (this.selectedWord != null) {
                this.game.removeWord(this.selectedWord.word);

                this.stage.removeChild(this.selectedWord);
                this.deleteButton.visible = false;

                var found = false;
                // animate the pending blocks
                var delay = 100;
                var wordElementIndex = -1;
                for (var n = 0; n < this.wordElements.length; n++) {
                    var textElement = this.wordElements[n];
                    if (textElement.text.toUpperCase() ==
                        this.selectedWord.word) {
                        found = true;
                        wordElementIndex = n;
                    };
                    if (found) {
                        var cont = textElement.parent;
                        var y_final_position = cont.y + this.wordHeight;
                        createjs.Tween.get(cont).wait(delay).to(
                            {y:y_final_position}, 1000,
                            createjs.Ease.bounceOut);
                        delay = delay + 100;
                    };
                };
                if (wordElementIndex > -1) {
                    this.wordElements.splice(wordElementIndex, 1);
                };
                this.selectedWord = null;

            };
        }, this);

        // the stage elements displaying every word in the word list
        this.wordElements = [];

        this.addWords = function (words) {
            if (words.length == 0) {
                this.onAnimation = false;
                return;
            };
            this.onAnimation = true;
            var word = words.pop();
            var cont = new createjs.Container();
            cont.x = 20; // margin_x;
            cont.y = 0;
            cont.mouseChildren = false;

            var alpha = 1.0;
            if (this.game.found.indexOf(word.toUpperCase()) > -1) {
                alpha = 0.25;
            };
            var text = this.addRoundedLabel(cont, word, alpha);
            cont.word = word.toUpperCase();

            this.stage.addChild(cont);

            this.wordElements.push(text);

            // startup the animation
            var y_final_position = this.canvas.height - this.wordHeight *
                this.wordElements.length;
            createjs.Tween.get(cont).to(
                {y:y_final_position}, 800,
                createjs.Ease.bounceOut).wait(100).call(
                this.addWords, [words], this);
        };

        this.addRoundedLabel = function(cont, word, alpha) {
            var padding = 10;
            var label;
            if (this.game.lowerCase) {
                label = word.toLowerCase();
            } else {
                label = word.toUpperCase();
            };
            var text = new createjs.Text(label, "24px Arial", "#000000");
            text.x = text.getMeasuredWidth() / 2 + padding;
            text.y = padding;
            text.textAlign = "center";

            var box = new createjs.Shape();
            box.graphics.beginFill(this.game.getWordColor(word, alpha)
                ).drawRoundRect(0, 0,
                           text.getMeasuredWidth() + padding * 2,
                           text.getMeasuredHeight()+ padding * 2, 20);
            cont.addChild(box);
            cont.addChild(text);

            cont.cache(0, 0,
                           text.getMeasuredWidth() + padding * 2,
                           text.getMeasuredHeight()+ padding * 2);
            cont.width = text.getMeasuredWidth() + padding * 2;
            cont.height = text.getMeasuredHeight()+ padding * 2;

            cont.on('click', function (event) {
                // if the game already started or the words are falling,
                // do nothing
                if (this.game.started || this.onAnimation) {
                    return;
                };

                if (event.target != this.selectedWord) {
                    cont = event.target;
                    this.selectedWord = cont;
                    // set the position of deleteButton and make visible
                    this.deleteButton.y = cont.y;
                    this.deleteButton.x = cont.x + cont.width + padding;

                    rect = this.deleteButtonImg.getBounds();
                    scale = cont.height / rect.height;
                    this.deleteButtonImg.scaleX = scale;
                    this.deleteButtonImg.scaleY = scale;

                    this.deleteButton.visible = true;
                };
            }, this);

            return text;
        }

        this.changeCase = function () {
            for (var i = 0; i < this.wordElements.length; i++) {
                var word = this.wordElements[i];
                if (this.game.lowerCase) {
                    word.text = word.text.toLowerCase();
                } else {
                    word.text = word.text.toUpperCase();
                };
                word.parent.updateCache();
            };
        };

        this.markFound = function (foundWord) {
            for (var i = 0; i < this.wordElements.length; i++) {
                var word = this.wordElements[i];
                if (word.text.toUpperCase() == foundWord) {
                    console.log('markFound ' + foundWord);
                    var cont = word.parent;
                    cont.removeAllChildren();
                    var text = this.addRoundedLabel(cont, foundWord, 0.25);
                    // update the reference in wordList
                    this.wordElements[i] = text;
                    this.stage.update();
                    break;
                };
            };
        };

        this.unmarkAll = function () {
            for (var i = 0; i < this.wordElements.length; i++) {
                var word = this.wordElements[i];
                var text = word.text;
                var cont = word.parent;
                cont.removeAllChildren();
                // update the reference in wordList
                this.wordElements[i] = this.addRoundedLabel(cont, text, 1);
            };
            this.stage.update();
        };

        this.gameStarted = function() {
            this.deleteButton.visible = false;
        };

    };

    wordlist.View = WordListView;

    return wordlist;
});