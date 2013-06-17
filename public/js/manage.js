UI = null;

UI = {
	
    render: function(firstLoad) {
        this.isWebkit = $.browser.webkit;
        this.isChrome = $.browser.webkit && !!window.chrome;
        this.isFirefox = $.browser.mozilla;
        this.isSafari = $.browser.webkit && !window.chrome;
        this.body = $('body');
        this.firstLoad = firstLoad;
//        if(firstLoad) this.startRender = true;
        this.pageStep = 100;

		this.isMac = (navigator.platform == 'MacIntel')? true : false;
        
        var page = location.pathname.split('/')[2];
        this.page = ('undefined'==typeof(page)||page == '')? 1 : parseInt(page);
        filtersStrings = (location.hash != '')? location.hash.split('#')[1].split(',') : '';
        this.filters = {};
        $.each(filtersStrings, function() {
        	var s = this.split('=');
        	UI.filters[s[0]] = s[1];
        });        
        this.isFiltered = !$.isEmptyObject(this.filters);
        if(this.isFiltered) {

        	if(typeof this.filters.pn != 'undefined') {
        		$('#search-projectname').val(this.filters.pn);
        	};
        	
        	if(typeof this.filters.source != 'undefined') {
        		$('#select-source option').each(function(){
        			if($(this).attr('value') == UI.filters.source) {
        				$('#select-source option[selected=selected]').removeAttr('selected');
        				$(this).attr('selected','selected');
        			}
		        })    	
        	};

        	if(typeof this.filters.target != 'undefined') {
        		$('#select-target option').each(function(){
        			if($(this).attr('value') == UI.filters.target) {
        				$('#select-target option[selected=selected]').removeAttr('selected');
        				$(this).attr('selected','selected');
        			}
		        })    	
        	};

        	if(typeof this.filters.status != 'undefined') {
        		$('#select-status option[selected=selected]').removeAttr('selected');
        		$('#select-status option[value='+this.filters.status+']').attr('selected','selected');
        	} else {
        		$('#select-status option[selected=selected]').removeAttr('selected');
        		$('#select-status option[value=ongoing]').attr('selected','selected');        		
        	};

        	if(typeof this.filters.onlycompleted != 'undefined') {
        		$('#only-completed').attr('checked','checked');

        	};
/*
        	if(typeof this.filters.showarchived != 'undefined') {
        		$('#show-archived').attr('checked','checked');

        	};

        	if(typeof this.filters.showcancelled != 'undefined') {
        		$('#show-cancelled').attr('checked','checked');

        	};
*/
        	this.body.addClass('filterOpen');
        } else {
        	this.body.removeClass('filterOpen filterActive');
	        UI.emptySearchbox();
        }
        this.getProjects('standard');
    },
    
    init: function() {

		this.body.on('click','.message a.undo',function(e) {  
	        e.preventDefault();
			switch($(this).data('operation'))
				{
				case 'changeStatus':

					$('.message').hide();
					var status = $(this).data('status');
					var res = $(this).data('res');
					var id = $(this).data('id');
					var ob = (res=='job')? $('tr.row[data-jid=' + id + ']') : $('.article[data-pid=' + id + ']');
					
					UI.doRequest({
						data: {
							action:		"changeJobsStatus",
							status: 	status,
							res: 		res,
							id:			id
						},
						context: ob,
						success: function(d){
							if(d.data == 'OK') {
								res = ($(this).hasClass('row'))? 'job':'prj';
								UI.changeJobsStatus_success(res,$(this),d,1);

							}
						}
					});

					break;

				default:
				}
	    })
		
		$("#contentBox").on('click','td.actions a.cancel',function(e) {  
	        e.preventDefault();
	        UI.changeJobsStatus('job',$(this).parents('tr'),'cancelled');
	    }).on('click','td.actions a.archive',function(e) {  
	        e.preventDefault();
	        UI.changeJobsStatus('job',$(this).parents('tr'),'archived');
	    }).on('click','td.actions a.resume',function(e) {  
	        e.preventDefault();
	        UI.changeJobsStatus('job',$(this).parents('tr'),'ongoing');
	    }).on('click','td.actions a.unarchive',function(e) {  
	        e.preventDefault();
	        UI.changeJobsStatus('job',$(this).parents('tr'),'ongoing');
	    }).on('click','a.cancel-project',function(e) {    
	        e.preventDefault();
	        UI.changeJobsStatus('prj',$(this).parents('.article'),'cancelled');		
	    }).on('click','a.archive-project',function(e) {
	        e.preventDefault();
	        UI.changeJobsStatus('prj',$(this).parents('.article'),'archived');		
	    }).on('click','td.actions a.change',function(e) {;
	        e.preventDefault();
			var m = confirm('You are changing the password for this job. \nThe current link will not work anymore! \nDo you want to proceed?');
			if(m) {
				UI.doRequest({
					data: {
						action:		"changePassword",
						res: 		"job",
						id: 		$(this).parents('tr').data('jid')
					},
					context: $(this).parents('tr.row').find('.job-detail'),
					success: function(d){
						var newPwd = d.password;
						uu = $('.urls .url',this);
						uuh = uu.attr('href');
						uuhs = uuh.split('-');
						oldPwd = uuhs[uuhs.length-1];
						newHref = uuh.replace(oldPwd,newPwd);
						uu.attr('href',newHref);
						$('.urls .url',this).text(config.hostpath + newHref);
						$(this).effect("highlight", {}, 1000);
	
					}
				});
			}
	
	    }).on('click','.meter a',function(e) {
	        e.preventDefault();
	    }).on('click','.tablefilter label',function(e) {	
	        $(this).parent().find('input').click();
	    }).on('click','.project-filter.cancelled input',function(e) {
	        var project = $(this).parents('.article');
	        project.toggleClass('showCancelled');
	    }).on('click','.project-filter.archived input',function(e) {
	        var project = $(this).parents('.article');
	        project.toggleClass('showArchived');
/*
	    }).on('click','a.previous',function(e) {
	        e.preventDefault();
			UI.page = UI.page-1;
			UI.getProjects();
	    }).on('click','a.next',function(e) {
	        e.preventDefault();
			UI.page = UI.page+1;
			UI.getProjects();
*/
	    }).on('click','.pagination a',function(e) {
	        e.preventDefault();
			UI.page = $(this).data('page');
			UI.getProjects('page');
		});
	    
	    $('header .filter').click(function(e) {    
	        e.preventDefault();
	        $('body').toggleClass('filterOpen');
	        $('#search-projectname').focus();
	    });
	
	    $('.searchbox #exec-filter').click(function(e) {    
	        e.preventDefault();

	        if($('#search-projectname').val() != '') {
	        	UI.filters['pn'] = $('#search-projectname').val();
	        } else {
	        	delete UI.filters['pn'];	        	
	        }

	        if($('#select-source').val() != '') {
	        	UI.filters['source'] = $('#select-source').val();
	        } else {
	        	delete UI.filters['source'];	        	
	        }

	        if($('#select-target').val() != '') {
	        	UI.filters['target'] = $('#select-target').val();
	        } else {
	        	delete UI.filters['target'];
	        }

	        if($('#select-status').val() != '') {
	        	UI.filters['status'] = $('#select-status').val();
	        } else {
	        	delete UI.filters['status'];
	        }

	        if($('#only-completed').is(':checked')) {
	        	UI.filters['onlycompleted'] = 1;
	        } else {
	        	delete UI.filters['onlycompleted'];
	        }
/*
	        if($('#show-archived').is(':checked')) {
	        	UI.filters['showarchived'] = 1;
	        } else {
	        	delete UI.filters['showarchived'];
	        }

	        if($('#show-cancelled').is(':checked')) {
	        	UI.filters['showcancelled'] = 1;
	        } else {
	        	delete UI.filters['showcancelled'];
	        }
*/
	        UI.filters['filter'] = 1;

	        UI.page = 1;
			UI.getProjects('filter');
			UI.body.addClass('filterActive');
/*     
	        if(ff) {
	        	UI.page = 1;
	        	UI.getProjects();
	        } else {
	        	alert('No filters selected');
	        }    
*/
	    });
	
	    $('.searchbox #clear-filter').click(function(e) {    
	        e.preventDefault();
	        $('body').removeClass('filterOpen filterActive');
	        UI.filters = {};
	        UI.page = 1;
	        UI.emptySearchbox();
	        UI.getProjects('standard');
	    });

	    $('.searchbox #show-archived, .searchbox #show-cancelled').click(function(e) {   
	        if ($(this).is(':checked')) {
		        $('.searchbox #only-completed').removeAttr('checked');        	
	        }
	    });
	    $('.searchbox #only-completed').click(function(e) {    
	        if ($(this).is(':checked')) {
		        $('.searchbox #show-archived, .searchbox #show-cancelled').removeAttr('checked');        	
	        }
	    });
	},

    verifyProjectHasCancelled: function(project) {
		hasCancelled = ($('tr[data-status=cancelled]',project).length)? 1 : 0;
		$(project).attr('data-hascancelled',hasCancelled);
    },

    verifyProjectHasArchived: function(project) {
		hasArchived = ($('tr[data-status=archived]',project).length)? 1 : 0;
		$(project).attr('data-hasarchived',hasArchived);
    },

    filters2hash: function() {
		var hash = '#';
		$.each(this.filters, function(key,value) {
			hash += key + '=' + value + ',';
		})
		hash = hash.substring(0, hash.length - 1);
		return hash;
    },

    emptySearchbox: function() {
        $('#search-projectname').val('');
        $('#select-source option[selected=selected]').removeAttr('selected');
        $('#select-source option').first().attr('selected','selected');
        $('#select-target option[selected=selected]').removeAttr('selected');
        $('#select-target option').first().attr('selected','selected');
    },
    
	doRequest: function(req) {
        var setup = {
            url:      config.basepath + '?action=' + req.data.action + this.appendTime(),
            data:     req.data,
            type:     'POST',
            dataType: 'json'
        };

        // Callbacks
        if (typeof req.success === 'function') setup.success = req.success;
        if (typeof req.complete === 'function') setup.complete = req.complete;
        if (typeof req.context != 'undefined') setup.context = req.context;

        $.ajax(setup);
	},

    appendTime: function() {
        var t = new Date();
        return '&time='+t.getTime();
    },

    changeJobsStatus: function(res,ob,status) {
        if(res=='job') {
        	UI.lastJobStatus = ob.data('status');
        	id = ob.data('jid');
        } else {
		    var arJobs = '';
		    $("tr.row",ob).each(function(){
		        arJobs += $(this).data('jid')+':'+$(this).data('status')+',';
		    })
		    arJobs = arJobs.substring(0, arJobs.length - 1);
		    UI.lastJobStatus = arJobs;
		    id = ob.data('pid');
        }

		UI.doRequest({
			data: {
				action:		"changeJobsStatus",
				status: 	status,
				res: 		res,
				id:			id
			},
			context: ob,
			success: function(d){
				if(d.data == 'OK') {
					res = ($(this).hasClass('row'))? 'job':'prj';
					UI.changeJobsStatus_success(res,$(this),d,0);
				}
			}
		});
    },

    changeJobsStatus_success: function(res,ob,d,undo) {
		if(res == 'job') {
			if(undo) {
				ob.attr('data-status',d.status);				
			} else {
				id = ob.data('jid');
				if(d.status == 'cancelled') {
					setHas = true;
					dataName = 'hascancelled';
					msg = 'A job has been cancelled.';
				} else if(d.status == 'archived') {
					setHas = true;
					dataName = 'hasarchived';
					msg = 'A job has been archived.';
				} else if(d.status == 'ongoing') {
					setHas = false;
					dataName = '';
					msg = 'A job has been resumed as ongoing.';
				}
				project = ob.parents('.article');
				ob.attr('data-status',d.status);
				if(setHas) project.attr('data-'+dataName,1);				
			}

		} else {
			if(undo) {
				console.log(d.status);
				$.each(d.status.split(','), function() {
					var s = this.split(':');
					$('tr.row[data-jid='+s[0]+']').attr('data-status',s[1]);
				})
			} else {
				id = ob.data('pid');
				if(d.status == 'cancelled') {
					setHas = true;
					dataName = 'hascancelled';
					msg = 'All the jobs in a project has been cancelled.';
				} else if(d.status == 'archived') {
					setHas = true;
					dataName = 'hasarchived';
					msg = 'All the jobs in a project has been archived.';
				} else if(d.status == 'ongoing') {
					setHas = false;
					dataName = '';
					msg = 'All the jobs in a project has been resumed as ongoing.';
				}	
				project = ob;
				$('tr.row',project).each(function(){
					$(this).attr('data-status',d.status);
					if(setHas) project.attr('data-'+dataName,1);
			    })
			}
		}
		if(!undo) {
			var token =  new Date();
			var resData = (res == 'prj')? 'pid':'jid';
			$('.message').attr('data-token',token.getTime()).html(msg + ' <a href="#" class="undo" data-res="' + res + '" data-id="' + ob.data(resData)+ '" data-operation="changeStatus" data-status="' + ((res == 'prj')? d.old_status : this.lastJobStatus) + '">Undo</a>').show();
			console.log($('.message').html());
			setTimeout(function(){
				$('.message[data-token='+token.getTime()+']').hide();
			},5000);
		}

		this.verifyProjectHasCancelled(project);
		this.verifyProjectHasArchived(project);



    },

    setTablesorter: function() {
	    $(".tablesorter").tablesorter({
	        textExtraction: function(node) { 
	            // extract data from markup and return it  
	            if($(node).hasClass('progress')) {
	            	var n = $(node).find('.translated-bar').attr('title').split(' ')[1];
	            	return n.substring(0, n.length - 1);
	            } else {
	            	return $(node).text();
	            }
	        }, 
	        headers: { 
	            1: { 
	                sorter: false 
	            }, 
	            4: { 
	                sorter: false 
	            } 
	        }			    	
	    });
    },

    getProjects: function(what) {
		UI.body.addClass('loading');
		var d = {
                action: 'getProjects',
                page:	UI.page
			}
		ar = $.extend(d,UI.filters);
		
		this.doRequest({
			data: ar,
			success: function(d){
				UI.body.removeClass('loading');
				data = $.parseJSON(d.data);
				if(data.length) {
					UI.renderPagination(d.page,1,d.pnumber);
				} else {
					$('.pagination').empty();
				}
				UI.renderProjects(data);
				if(data.length) UI.renderPagination(d.page,0,d.pnumber);
				UI.setTablesorter();
				var stateObj = { page: d.page };
//				history.pushState(stateObj, "page "+d.page, d.page+location.hash);
				// memo: se sto solo facendo un filtro devo usare pushState, altrimenti replaceState
				if(what == 'filter') {
					history.pushState(stateObj, "page "+d.page, d.page+UI.filters2hash());
				} else if(what == 'page') {
					history.pushState(stateObj, "page "+d.page, d.page+UI.filters2hash());
				} else {
					history.replaceState(stateObj, "page "+d.page, d.page+UI.filters2hash());
				}
				UI.compileDisplay();
			}
		});
	},

    compileDisplay: function() {
    	var status = (typeof this.filters.status != 'undefined')? this.filters.status : 'ongoing';
    	var pname = (typeof this.filters.pn != 'undefined')? ' "<strong>' + this.filters.pn + '</strong>" in the name,' : '';
    	var source = (typeof this.filters.source != 'undefined')? ' <strong>' + $('#select-source option[value='+this.filters.source+']').text() + '</strong> as source language,' : '';
    	var target = (typeof this.filters.target != 'undefined')? ' <strong>' + $('#select-target option[value='+this.filters.target+']').text() + '</strong> as target language,' : '';
    	var completed = (typeof this.filters.onlycompleted != 'undefined')? ' <strong>completed</strong>' : '';
    	var ff = ((pname != '')||(source != '')||(target != ''))? ' having' : '';
    	var tt = 'showing' + completed + ' <strong class="status">' + status + '</strong> projects' + ff + pname + source + target;
    	tt = tt.replace(/\,$/, '');
    	$('#display').html(tt);
	},

    renderPagination: function(page,top,pnumber) {
    	page = parseInt(page);
    	
    	var prevLink = (page>1)? '<a href="#" data-page="' + (page-1) + '">&lt;</a>' : '';
    	var aroundBefore = (page==1)? '<strong>1</strong>' : (page==2)? '<a href="#" data-page="1">1</a><strong>2</strong>' : (page==3)? '<a href="#" data-page="1">1</a><a href="#" data-page="2">2</a><strong>3</strong>' : (page==4)? '<a href="#" data-page="1">1</a><a href="#" data-page="2">2</a><a href="#" data-page="3">3</a><strong>4</strong>' : '<a href="#" data-page="1">1</a>...<a href="#" data-page="'+(page-2)+'">'+(page-2)+'</a><a href="#" data-page="'+(page-1)+'">'+(page-1)+'</a><strong>'+page+'</strong>';
    	var pages = Math.floor(pnumber/UI.pageStep)+1;
     	var nextLink = (page<pages)? '<a href="#" data-page="' + (page+1) + '">&gt;</a>' : '';
    	var aroundAfter = (page==pages)? '' : (page==pages-1)? '<a href="#" data-page="'+(page+1)+'">'+(page+1)+'</a>' : (page==pages-2)? '<a href="#" data-page="'+(page+1)+'">'+(page+1)+'</a><a href="#" data-page="'+(page+2)+'">'+(page+2)+'</a>' : (page==pages-3)? '<a href="#" data-page="'+(page+1)+'">'+(page+1)+'</a><a href="#" data-page="'+(page+2)+'">'+(page+2)+'</a><a href="#" data-page="'+(page+3)+'">'+(page+3)+'</a>' : '<a href="#" data-page="'+(page+1)+'">'+(page+1)+'</a><a href="#" data-page="'+(page+2)+'">'+(page+2)+'</a>...<a href="#" data-page="'+(pages)+'">'+(pages)+'</a>';

     	var fullLink = prevLink + aroundBefore + aroundAfter + nextLink;

	   	if(top) {
    		if($('.pagination.top').length) {
    			$('.pagination.top').html(fullLink);
    		} else {
    			$('#contentBox h1').after('<div class="pagination top">'+fullLink+'</div>');
    		}
    	} else {
    		if($('.pagination.bottom').length) {
    			$('.pagination.bottom').html(fullLink);
    		} else {
    			$('#contentBox').append('<div class="pagination bottom">'+fullLink+'</div>');
    		}
    	}

	},

    formatDate: function(tt) {
    	var t = UI.retrieveTime;
    	var d = new Date(tt);
    	
//    	console.log(UI.retrieveTime.toDateString());
//    	console.log(d.toDateString());
/*
		var options = {year: "numeric", month: "short", day: "numeric"};
    	prova = d.toLocaleDateString("en-US", options);
    	console.log(prova);
*/
    	if(d.getDate() == t.getDate()) {
    		txtDay = 'today';
    	} else if(d.getDate() == t.getDate()-1) {
    		txtDay = 'yesterday';
    	} else if((d.getFullYear()==t.getFullYear())&&(d.getMonth()==t.getMonth())) {
    		txtDay = monthNames[d.getMonth()] + ' ' + d.getDate() + ' ' + dayNames[d.getDay()];
    	} else {
    		txtDay = ((d.getFullYear()==t.getFullYear())? '' : d.getFullYear()) + ' ' + monthNames[d.getMonth()] + ' ' + d.getDate();
    	}
    	h = d.getHours();
     	m = d.getMinutes();
   		formattedData =  txtDay + ', ' + ((h<10)? '0':'') + h +':' + ((m<10)? '0':'') + m;
//    	formattedData = d.getFullYear() + ' ' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getHours() + ':' + d.getMinutes();
//    	today = 
    	return formattedData;
	},

    renderProjects: function(d) {
        this.retrieveTime = new Date();
        var projects = '';
        $.each(d, function() {
            var project = this;
            var newProject = '';

			newProject += '<div data-pid="'+this.id+'" class="article" data-hasarchived="'+this.has_archived+'" data-hascancelled="'+this.has_cancelled+'">'+
	            '	<div class="head">'+
		        '	    <h2>'+this.name+'</h2>'+
		        '	    <div class="project-details">'+
		        '			<span class="id-project" title="Project ID">'+this.id+'</span> - <a target="_blank" href="/analyze/'+project.name+'/'+this.id+'-'+this.password+'" title="Volume Analysis">100 words</a>'+
		        '			<a href="#" title="Cancel project" class="cancel-project"></a>'+
		        '	    	<a href="#" title="Archive project" class="archive-project"></a>'+
		        '		</div>'+
	            '	</div>'+
	            '	<div class="field">'+
	            '		<h3>Machine Translation:</h3>'+
	            '		<span class="value">MyMemory (All Pairs)</span>'+
	            '	</div>'+
	            
	            '	<div class="tablefilter">'+
	            '		<div class="project-filter archived">'+
		        '	    	<input type="checkbox" id="filter-archived-'+this.id+'">'+
		        '	    	<label href="#" onclick="return false" for="filter-archived-'+this.id+'">Show archived jobs</label>'+
	            '		</div>'+

	            '		<div class="project-filter cancelled">'+
		        '	    	<input type="checkbox" id="filter-cancelled-'+this.id+'">'+
		        '	    	<label href="#" onclick="return false" for="filter-cancelled-'+this.id+'">Show cancelled jobs</label>'+
	            '		</div>'+
	            '	</div>'+

		        '    <table class="tablestats continue tablesorter" width="100%" border="0" cellspacing="0" cellpadding="0" id="project-'+this.id+'">'+
		        '        <thead>'+
			    '            <tr>'+
			    '                <th class="create-date header">Create Date</th>'+
			    '                <th class="job-detail">Job</th>'+
			    '                <th class="words header">Payable Words</th>'+
			    '                <th class="progress header">Progress</th>'+
			    '                <th class="actions">Actions</th>'+
			    '            </tr>'+
		        '        </thead>'+
	
				'		<tbody>';
    		$.each(this.jobs, function() {
//    			console.log(this);
        		var newJob = '';


		        newJob += '    <tr class="row " data-jid="'+this.id+'" data-status="'+this.status+'">'+
		            '        <td class="create-date" data-date="'+this.create_date+'">'+UI.formatDate(this.create_date)+'</td>'+
		            '        <td class="job-detail">'+
		            '        	<span class="urls">'+
		            '        		<div class="langs">'+this.sourceTxt+'&nbsp;&gt;&nbsp;'+this.targetTxt+'</div>'+
		            '        		<a class="url" target="_blank" href="/translate/'+project.name+'/'+this.source+'-'+this.target+'/'+this.id+'-'+this.password+'">http://matecat.translated.home/translate/.../'+this.id+'-'+this.password+'</a>'+
		            '        	</span>'+
		            '        </td>'+
		            '        <td class="words">'+this.stats.TOTAL_FORMATTED+'</td>'+
		            '        <td class="progress">'+
				    '            <div class="meter">'+
				
				    '                <a href="#" class="approved-bar" title="Approved '+this.stats.APPROVED_PERC_FORMATTED+'%" style="width:'+this.stats.APPROVED_PERC+'%"></a>'+
				    '                <a href="#" class="translated-bar" title="Translated '+this.stats.TRANSLATED_PERC_FORMATTED+'%" style="width:'+this.stats.TRANSLATED_PERC+'%"></a>'+
				    '                <a href="#" class="rejected-bar" title="Rejected '+this.stats.REJECTED_PERC_FORMATTED+'%" style="width:'+this.stats.REJECTED_PERC+'%"></a>'+
				    '                <a href="#" class="draft-bar" title="Draft '+this.stats.DRAFT_PERC_FORMATTED+'%" style="width:'+this.stats.DRAFT_PERC+'%"></a>'+
				    '            </div>'+
		            '        </td>'+
		            '        <td class="actions">'+
		            '            <a class="change" href="#" title="Change job password">Change</a>'+
		            '            <a class="cancel" href="#" title="Cancel Job">Cancel</a>'+
		            '            <a class="archive" href="#" title="Archive Job">Archive</a>'+
		            '            <a class="resume" href="#" title="Resume Job">Resume</a>'+
		            '            <a class="unarchive" href="#" title="Unarchive Job">Unarchive</a>'+
		            '        </td>'+
		            '    </tr>';

				newProject += newJob;
    		});


			newProject +='		</tbody>'+	
	        '    </table>'+
            '</div>';
    		
    		projects += newProject;
//			$('#contentBox').append(newProject);
     	
        });
        if(projects == '') projects = '<p class="article msg">No projects found for these filter parameters.<p>';

        $('#projects').html(projects);

    } // renderProjects

} // UI

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

var dayNames = [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];


function setBrowserHistoryBehavior() {

	window.onpopstate = function(e) {
		e.preventDefault();
		if(UI.firstLoad) {
			UI.firstLoad = false;
			return;
		}
		UI.render(false);
	};

}

$(document).ready(function(){
    setBrowserHistoryBehavior();
    UI.render(true);
	UI.init();
});

