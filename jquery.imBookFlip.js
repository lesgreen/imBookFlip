 /*
 * 	 imBookFlip - a JQuery Plugin
 * 	 @author Les Green
 * 	 Copyright (C) 2009 Intriguing Minds, Inc.
 * 
 * 	 Version 1.0 22 Dec 2011
 *   1. Changed to a jquery class (oop).
 *   2. Added ability to control externally (click on button to start and stop).
 *   3. Go to a specific page.
 *   4. Fixed bug: There seemed to be a 20 page max in createPage function
 *   5. Added flipDirection option.
 *      ltr - default
 *      rtl
 * 
 *   Version 0.7 - 4 July 2010
 *   1. Option to add separate audio to each page 
 * 
 *   Version 0.6
 * 
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *   
 *   original Javascript BookFlip concept - http://www.coastworx.com/bookflip.php
 *   soundManager - Scott Schiller http://www.schillmania.com/projects/soundmanager2/
 *
 *   Demo and Documentation can be found at:   
 *   http://www.grasshopperpebbles.com
 *   
 */

;(function($) {
	$.fn.imBookFlip = function(pluginOptions) {
		if (this.length >1) {
			this.each(function() { $(this).imBookFlip(pluginOptions) });
            return this;
		}
		
		 // SETUP private variabls;
        var imBookFlip = this;
        var numPages = 0;
		var leftStart=0,rightStart=1;
		var autoPage = 0;
		var page, book, bW, pageW, pageH, bookOpenW = '';
		var aAudio = new Array();
		var selectedAudio = 0;
		var pageSelected = -1;
 
        // setup options
       	var defaults = {
			allowPageClick: true,
			autoFlip: 'off', //auto, click
			autoFlipSpeed: 7000,
			goToPageSpeed: 500,
			numPixels: 20, //number of pixels to move per frame, more is faster but less smooth
			pSpeed: '20', //page speed, 20 is best for Opera browser. Less is faster
			page_class: '',
			sound_manager: '', // {swf_loc: 'soundmanager/soundmanager2.swf', audio_loc: '', debug: false}
			iframe: '', //{src: 'test_bookflip3_iframe.html', book: 'myBook'}
			flipDirection: 'ltr'
		};
		
		var opts = $.extend({}, defaults, pluginOptions);
		 
		var initialize = function() {
		       // support MetaData plugin
		   if ($.meta){
		       options = $.extend({}, opts, this.data());
		   }
		   return imBookFlip;
		};
		
		
		/* Public Methods */
		this.create = function() {
			if (opts.sound_manager) {
				var tf = initSoundManager();
				if (opts.sound_manager.audio_loc) {
					loadAudio(opts.sound_manager.audio_loc);	
				} else if (opts.sound_manager.page_audio) {
					tf = getPageAudio(opts.sound_manager.page_audio);
				}
			}
		
			if (opts.iframe.src) {
				loadIFrame();
			} else {
				page = $('.'+opts.page_class)[0];
				init();
			}
		};
		
		this.flipPage = function(d) {
			if (d == 'next') {
				nextPage();
			} else {
				prevPage();
			}
		};
		
		this.goToPage = function(pageNum) {
			pageNum = parseInt(pageNum);
			if ((pageNum >= 0) && (pageNum < numPages)) {
				pageSelected = (numberIsEven(pageNum)) ? pageNum : pageNum + 1;
				if (pageSelected > rightStart) {
					//go forward
					goToNextPage();
				} else {
					//go backward
					goToPrevPage();
				}
			}
		};
		
		var loadIFrame = function() {
			//var iframe = $this.append($('<iframe src="'+opts.iframe.src+'" id="bookFlipIframe" name="bookFlipIframe"></iframe>').css({"width":$this.width(), "height": $this.height(), "border": "0px", "overflow":"hidden"}));
			var iframe = $('<iframe src="'+opts.iframe.src+'" id="bookFlipIframe" name="bookFlipIframe"></iframe>').css({"width":imBookFlip.width(), "height": imBookFlip.height(), "border": "0px", "overflow":"hidden"}).appendTo(imBookFlip);
			$('#bookFlipIframe').load(function() {
				book = $('#bookFlipIframe').contents().find('#'+opts.iframe.book);
				page = $('#bookFlipIframe').contents().find('.'+opts.page_class)[0];
				init();	
			});		
		};
		
		var init = function() {
			bW = parseInt($(page).css('borderLeftWidth')) + parseInt($(page).css('borderRightWidth'));
			pageW = parseInt($(page).css('width')) + bW;
			pageH = parseInt($(page).css('height')) + bW;
			bookOpenW = pageW*2;
			
			//var showBinder=false; //change to false for no binder
			//var binderImage = "parchmentring2.gif"; //location of center binder
			//var binderWidth = 20; //width of center binder image		
			
			if(opts.numPixels>100){opts.numPixels=100;};
			createPages();	
		};
		
		var getPageAudio = function(audio) {
			$.each(audio, function (i, itm) {
				aAudio[i] = itm.audio_loc;
			});
			return true;	
		};
		
		var initSoundManager = function() {
			var dbg = false;
			if (opts.sound_manager.debug) {
				dbg = opts.sound_manager.debug;
			}
			soundManager.url = opts.sound_manager.swf_loc;
			soundManager.debugMode = dbg;
			return true;
		};
			
		var loadAudio = function(loc) {
			var ld = (opts.autoFlip != 'click');
			soundManager.onload = function() {
				// soundManager is initialised, ready to use. Create a sound for this demo page.
				soundManager.createSound({
					id: 'imBookAudio' + selectedAudio,
					url: loc,
					autoLoad: true,
					autoPlay: ld
				});
			}
		};
		
		var unloadAudio = function() {
			soundManager.unload('imBookAudio' + selectedAudio);
		};
		
		var createPages = function() {
			var pages, orig, lft, div, pW;
			if (opts.iframe.src) {
				$this = $(book);
				pages = $this.find(' > div');
			} else {
				var bk = imBookFlip.attr('id');
				//console.log(bk);
				$this = imBookFlip;
				pages = $('#'+bk + ' > div');	
			}
			$this.css({'width': (bookOpenW + 'px'), 'height': pageH+'px', 'zIndex':0});
			numPages = $(pages).length; 
			$(pages).each(function(i) {
				//numPages++;
				orig = $(this).clone();
				lft = (opts.flipDirection == 'ltr') ? pageW : 0;
				div = $('<div></div>').attr({'id': 'pageNum'+i, 'class': opts.page_class}).css({'zIndex':numPages - i, 'border': 'none', 'left': lft+'px', 'width': pageW+'px', 'height': pageH+'px'});
				$(this).replaceWith(div);
				if (numberIsEven(i)) {
					$(div).data("clickEvent", {
						url: aAudio[i]
					});
				}
				$(orig).attr('id', 'pageFlip'+i);
				$(div).append($(orig));
				if(opts.allowPageClick){
					$(orig).click(function() {
						if (opts.flipDirection == 'ltr') {
							if(numberIsEven(i)){
								soundCheck();
								nextPage();
							} else {
								prevPage();
							}
						} else {
							if(numberIsEven(i)){
								soundCheck();
								nextPageRtl();
								//nextPage();
							} else {
								prevPageRtl();
							}
						}
					});
				}
			});
			$this.css('display', 'block');
			if (opts.autoFlip == 'auto') {
				if (opts.flipDirection == 'ltr') {
					doAutoFlip();
				} else {
					doAutoFlipRtl();
				}	
			}
			
		};
		
		var doAutoFlip = function() {
			if (rightStart < numPages) {
				autoPage = setTimeout(nextPage, opts.autoFlipSpeed);
			} else {
				clearTimeout(autoPage);
			}
		};
		
		var doAutoFlipRtl = function() {
			if (leftStart > 0) {
				autoPage = setTimeout(nextPageRtl, opts.autoFlipSpeed);
			} else {
				clearTimeout(autoPage);
			}
		};
		
		var soundCheck = function() {
			if ((opts.sound_manager) && (rightStart == 1)) {
				if (opts.autoFlip == 'click') {
					soundManager.play('imBookAudio' + selectedAudio);
				}
			}
		};
		
		var numberIsEven = function(value) {
			//  returns true if value is even, false if value is odd
			return ( 1 - (value%2) ); 
		};
		
		var nextPage = function(){
			var page = (opts.iframe.src) ? $this.find("#pageNum"+rightStart) : $("#pageNum"+rightStart);
			var lpage = (opts.iframe.src) ? $this.find("#pageNum"+leftStart) : $("#pageNum"+leftStart);
			$(page).css({'width': '0px', 'left': bookOpenW +'px', 'zIndex': 1000});
			$(page).animate({'left': 2+'px', 'width': pageW+'px'}, 'slow', function() {
				//$(lpage).css({'width': '0px'});
				//var z = $(this).css('zIndex');
				$(this).css({'left': '0px', 'width': pageW+'px', 'zIndex': 0});
				$(lpage).css({'left': '', 'right': '0px', 'width': '0px'});
				$(this).css({'left': '', 'right': '0px'});
				leftStart+=2;
				rightStart+=2;
				if (pageSelected != -1) {
					goToNextPage();
				} else if (opts.autoFlip != 'off') {
					doAutoFlip();
				}
			});
		};
		
		var nextPageRtl = function(){
			var page = (opts.iframe.src) ? $this.find("#pageNum"+rightStart) : $("#pageNum"+rightStart);
			var lpage = (opts.iframe.src) ? $this.find("#pageNum"+leftStart) : $("#pageNum"+leftStart);
			$(page).css({'width': '0px', 'left': '0px', 'zIndex': 1000});
			$(page).animate({'left': pageW+'px', 'width': pageW+'px'}, 'slow', function() { 
				$(lpage).css({'width': '0px','left': '', 'right': '0px'});
				$(this).css({'zIndex': 0});
				leftStart+=2;
				rightStart+=2;
				if (pageSelected != -1) {
					goToNextPage();
				} else if (opts.autoFlip != 'off') {
					doAutoFlipRtl();
				} 
			});
		};
		
		var prevPage = function(){
			leftStart-=2;
			rightStart-=2;
			var page = (opts.iframe.src) ? $this.find("#pageNum"+leftStart) : $("#pageNum"+leftStart);
			var rpage = (opts.iframe.src) ? $this.find("#pageNum"+rightStart) : $("#pageNum"+rightStart);
			var pFlipL = (opts.iframe.src) ? $this.find("#pageFlip"+leftStart) : $("#pageFlip"+leftStart);
			var pFlipR = (opts.iframe.src) ? $this.find("#pageFlip"+rightStart) : $("#pageFlip"+rightStart);
			$(page).css({'width': '0px', 'left': '0px'});
			$(pFlipR).css({'left': '', 'right': '0px'});
			$(page).animate({'left': pageW+'px', 'width': pageW+'px'}, 'slow', function() { 
				$(rpage).css({'width': '0px'});
				$(pFlipR).css({'left': '0px'});
				$(pFlipL).css({'left': '0px'});
			});
			if (pageSelected != -1) {
				goToPrevPage();
			}
		};
		
		var prevPageRtl = function(){
			leftStart-=2;
			rightStart-=2;
			var page = (opts.iframe.src) ? $this.find("#pageNum"+rightStart) : $("#pageNum"+rightStart);
			var rpage = (opts.iframe.src) ? $this.find("#pageNum"+leftStart) : $("#pageNum"+leftStart);
			var pFlipL = (opts.iframe.src) ? $this.find("#pageFlip"+rightStart) : $("#pageFlip"+rightStart);
			var pFlipR = (opts.iframe.src) ? $this.find("#pageFlip"+leftStart) : $("#pageFlip"+leftStart);
			//$(rpage).css({'width': '0px', 'left': '0px'});
			$(pFlipR).css({'left': '', 'right': '0px'});
			$(page).css('zIndex', 1000);
			$(page).animate({'left': '0px', 'width': '0px'}, 'slow', function() { 
				$(rpage).css({'width': pageW+'px'});
				$(pFlipR).css({'left': '0px'});
				$(pFlipL).css({'left': '0px'});
			});
			if (pageSelected != -1) {
				goToPrevPage();
			}
		};
		
		var goToNextPage = function() {
			if (rightStart < pageSelected) {
				var fn = (opts.flipDirection == 'ltr') ? nextPage : nextPageRtl;
				autoPage = setTimeout(fn, opts.goToPageSpeed);
			} else {
				clearTimeout(autoPage);
			}
		};
		
		var goToPrevPage = function() {
			if (leftStart > pageSelected) {
				var fn = (opts.flipDirection == 'ltr') ? prevPage : prevPageRtl;
				autoPage = setTimeout(fn, opts.goToPageSpeed);
			} else {
				clearTimeout(autoPage);
			}
		};
		
		return initialize();
	}
})(jQuery);	