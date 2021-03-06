'use strict';

/* Services */

angular.module('clearApp.servicesTransport', ['ngResource'])

	.factory('E1', ['$resource', function($resource) {
		return $resource('../index_rest.php/api/clear/v1/:type/:id', { type:'@type', id:'@id' });
	}])
	
	.factory('E2', ['$resource', function($resource) {
		return $resource('../index_rest.php/api/clear/v2/:format/:type/:id/:action', 
			{ format:'@format', type:'@type', id:'@id', action:'@action' }, 
			{
				update: { method: 'PUT' }, 
				updateList: { method: 'PUT', isArray: true }
			});
	}])
	
	.factory('ElmsConf', ['$resource', function($resource){
		return $resource('modules/transport/json/elms_conf.json');
	}])
	
	.factory('AlertsConfig', ['$resource', function($resource){
		return $resource('modules/transport/json/alerts_conf.json');
	}])
	
	.factory('DocumentsConfig', ['$resource', function($resource){
		return $resource('modules/transport/json/documents_conf.json');
	}])

	.factory('GuidelinesProcess', ['$resource', function($resource){
		return $resource('modules/transport/json/guidelines_process.json');
	}])
	
	.factory('GuidelinesWeb', ['$resource', function($resource){
		return $resource('modules/transport/json/guidelines_web.json');
	}])
	
	.factory('GuidelinesMobile', ['$resource', function($resource){
		return $resource('modules/transport/json/guidelines_mobile.json');
	}])
	
	.factory('TransportElement', ['$timeout', 'ClearToken', 'toaster', 'Utils', function($timeout, ClearToken, toaster, Utils){
		
		return {
		
			elementUpdate: function(elm, current) {
				var self = this;
				self.propertiesDate(elm); 
				self.elementUpdateUrl(elm); 
				self.qrCodeGoogle(elm);
				self.elementTimeline(elm);
				for (var index in elm.charts) {
					self.colorScaleConfig(elm.charts[index], elm.charts[index].value);
				}
				console.log('current ii: ', current); 
				if (current) {
					$timeout(function() {
						elm.current = {
							"property": current.property, 
							"related": current.related
						} 
					}).then(function() {
						console.log('current: ', elm.current); 
					});
				}
				return elm;
			}, 
			
			elementTimeline: function(elm) {
				if (!elm.anim && elm.timeline) {
					for (var i = 0; i < 4; i++) {
						if (elm.timeline[i].completed) elm.timeline[i].anim = true; 
					}
				} 
				return elm;
			}, 
			
			elementUpdateUrl: function(elm) {
				if (elm.documents) {
					for (var i in elm.documents) {
						elm.documents[i].url = elm.documents[i].url + '?oauth_token=' + ClearToken.returnToken();
					}
				} 
				return elm;
			}, 
			
			documentUploadSave: function(doc, elm, user) {
				var self=this;
				var current = angular.copy(elm.current);
				doc.user = { 
					"first_name": user.first_name, 
					"last_name": user.last_name, 
					"id": user.id
				}
				
				doc.dates = { "created": Utils.dateToTimestamp( new Date()) };  
				
				elm.documents.push(doc); 					
				elm.$update({ "documentUpload": doc.id }, function(elm, response) {
					var toasterMessage; 
					
					if (response("X-Clear-updatedDocument")==="success") toasterMessage = "Updated document";
					else if (response("X-Clear-updatedDocument")==="warning") toasterMessage = "Document did not update";
					else if (response("X-Clear-updatedDocument")==="error") toasterMessage = "Document did not update";
					
					if (response("X-Clear-updatedDocument")) toaster.pop(response("X-Clear-updatedDocument"), toasterMessage, doc.name);
					console.log("upload succeed");
					elm = self.elementUpdate(elm, current);
				}, function() {
					console.log("upload error");
					toaster.pop("error", "Nothing updated");
				});
			}, 
			
			alertSave: function(elm, alert, user) {
				var self=this;
				var current = angular.copy(elm.current);
				alert.user = { 
					"first_name": user.first_name, 
					"name": user.name, 
					"id": user.id
				}
				
				if (!alert.dates) alert.dates = []; 
				
				alert.dates.modified = Utils.dateToTimestamp(new Date());  
				
				if (alert.id) { 
					elm.alerts[Utils.objectIndexbyKey(elm.alerts, "id", alert.id)] = alert; 
				} else { 
					if (elm.alerts) {
						elm.alerts[elm.alerts.length] = alert;
					} else {
						elm.alerts = []; 
						elm.alerts[0] = alert; 
					}
					alert.id = "new"; 
				}
			
				elm.$update({ 'alertUpdateId': alert.id }, function(elm, response) {
					var alertMessage; 
					
					if (response("X-Clear-updatedAlert")==="success") alertMessage = "Alert updated";
					else if (response("X-Clear-updatedAlert")==="warning") alertMessage = "Alert did not update";
					else if (response("X-Clear-updatedAlert")==="error") alertMessage = "Alert did not update";
					
					if (response("X-Clear-updatedAlert")) toaster.pop(response("X-Clear-updatedAlert"), alertMessage, alert.name);
					
					elm = self.elementUpdate(elm, current);
				});
			}, 
			
			alertDelete: function(elm, alert) {
				var self=this;
				var current = angular.copy(elm.current);
				elm.$update({ 'alertDeleteId': alert.id }, function(elm, response) {
					var alertMessage; 
					
					if (response("X-Clear-updatedAlert")==="success") alertMessage = "Deleted alert";
					else if (response("X-Clear-updatedAlert")==="warning") alertMessage = "Alert did not deleted";
					else if (response("X-Clear-updatedAlert")==="error") alertMessage = "Alert did not deleted";
					
					if (response("X-Clear-updatedAlert")) toaster.pop(response("X-Clear-updatedAlert"), alertMessage, alert.name);
					
					elm = self.elementUpdate(elm, current);
				});
			}, 
			
			propertySave: function(elm, property) {
				var self=this;
				var current = angular.copy(elm.current);
				elm.$update({ 'propertyUpdateId': property.id, 'propertyUpdateVal': property.value }, function(elm, response) {
					var propertyMessage; 
					if (response("X-Clear-updatedProperty")==="success") propertyMessage = "Property updated";
					else if (response("X-Clear-updatedProperty")==="warning") propertyMessage = "Property did not update";
					else if (response("X-Clear-updatedProperty")==="error") propertyMessage = "Property did not update";
					if (response("X-Clear-updatedProperty")) toaster.pop(response("X-Clear-updatedProperty"), propertyMessage, property.name);
					elm = self.elementUpdate(elm, current);
				});
			}, 
			
			conditionSave: function (elm, condition) {
				var self=this;
				if (elm.current) var current = angular.copy(elm.current);
				
				elm.$update({ 'requiredId': condition.id, 'requiredValue': condition.value }, function(elm, response) {
					var conditionMessage, milestoneMessage; 
					
					if (response("X-Clear-updatedRequired")==="success") conditionMessage = "Condition updated";
					else if (response("X-Clear-updatedRequired")==="warning") conditionMessage = "Condition did not update";
					else if (response("X-Clear-updatedRequired")==="error") conditionMessage = "Condition did not update";
					
					if (response("X-Clear-updatedMilestone")==="success") milestoneMessage = "Milestone updated";
					else if (response("X-Clear-updatedMilestone")==="warning") milestoneMessage = "Milestone did not update";
					else if (response("X-Clear-updatedMilestone")==="error") milestoneMessage = "Milestone did not update";
					
					if (response("X-Clear-updatedRequired")) toaster.pop(response("X-Clear-updatedRequired"), conditionMessage, condition.name);
					if (response("X-Clear-updatedMilestone")) toaster.pop(response("X-Clear-updatedMilestone"), milestoneMessage, response("X-Clear-updatedMilestoneName"));
					console.log("success");  
					elm = self.elementUpdate(elm, current);
				}, function(error) {
					console.log("error: ", error);
				});
			}, 
			
			propertiesDate: function (elm){
				// init date properties from unix timestamp to javascript date
				var date = {};
				for (var group in elm.properties) {
					for (var property in elm.properties[group].set) {
						var property = elm.properties[group].set[property];
						if (property.type === 'date') {
							if (property.value)	property.date = Utils.timestampToDate(property.value);
						}
					}
				}
				return elm;
			}, 
			
			qrCodeGoogle: function (elm) {
				var e;
				switch (elm.type) {
					case 'order': e = 'O'; break;
					case 'shipment': e = 'S'; break;
					case 'box': e = 'B'; break;
					case 'item': e = 'I'; break;
				}
				elm.qrCodeGoogle = 'http://chart.apis.google.com/chart?cht=qr&chs=63x63&chl='+ e + elm.id + '&chld=H%7C0';
				return elm;
			}, 
			
			colorScaleConfig: function(elm, value){
				var colorBest = '#5cb85c', 
					colorGood = '#a6b15b', 
					colorMedium = '#eeac57', 
					colorBad = '#e28054', 
					colorWorst = '#d75452';
				
				var snapToGrid = function (value) {
					var dest = null;
					var gridArray = [ 0, 20, 40, 60, 80, 101 ];
					for (var i=0, len=gridArray.length; i<gridArray.length; i++) {
						if (gridArray[i] > value) {
							dest = i-1;
							break;
						}
					}
					return dest;
				}
				var colorFn = function (value) {
					var colorArrayScale = [ colorWorst, colorBad, colorMedium, colorGood, colorBest ];
					return { 'color': colorArrayScale[snapToGrid(value)] };	
				}
				 
				var labelFn = function (value) {
					var textArrayScale = [ 'worst', 'bad', 'medium', 'good', 'best' ];
					return textArrayScale[snapToGrid(value)];	
				}
				
				elm.color = colorFn(value); 
				elm.label = labelFn(value);
				
				return elm;
			}
		}
	}])
	
	.factory('TransportAlert', ['Utils', 'toaster', function(Utils, toaster){
		
		return {
			
			alertSave: function(alerts, alert, user) {
				alert.user = { 
					"first_name": user.first_name, 
					"last_name": user.name, 
					"id": user.id
				}
				
				alert.dates.modified = Utils.dateToTimestamp(new Date());  
				
				var alertIndex = Utils.objectIndexbyKey(alerts, "id", alert.id); 
				alerts[alertIndex] = alert; 
										
				alert.$update({ 'type': 'alert' }, function(alert, response) {
					var toasterMessage; 
					console.log('alertddd: ', alert ); 
					if (response("X-Clear-updatedAlert")==="success") toasterMessage = "Alert was updated";
					else if (response("X-Clear-updatedAlert")==="warning") toasterMessage = "Alert was not updated";
					else if (response("X-Clear-updatedAlert")==="error") toasterMessage = "Alert was not updated";
					
					if (response("X-Clear-updatedAlert")) toaster.pop(response("X-Clear-updatedAlert"), toasterMessage, alert.name);
				});
			}, 
			
			alertDelete: function(alerts, alert) {
			
				var alertIndex = Utils.objectIndexbyKey(alerts, "id", alert.id); 
				alerts[alertIndex] = alert; 
				
				alert.$delete({"type": "alert"}, function(elm, response) {
					var toasterMessage; 
					var toasterResponse = response("X-Clear-updatedAlert"); 
					
					if (toasterResponse==="success") toasterMessage = "Alert was deletd";
					else if (toasterResponse==="warning") toasterMessage = "Alert was not deleted";
					else if (toasterResponse==="error") toasterMessage = "Alert was not deleted";
					
					if (toasterResponse) toaster.pop(toasterResponse, toasterMessage, alert.name);
					if (!elm.id) {
						alerts.splice(Utils.objectIndexbyKey(alerts, "id", alert.id), 1);
					}
				});
			}
		}
	}])
	
	.factory('TransportDocument', ['$route', 'Utils', 'ClearUrl', 'toaster', function($route, Utils, ClearUrl, toaster){
		
		return {
			
			documentUploadSave: function(doc, type, user) {
				doc.user = { 
					"first_name": user.first_name, 
					"last_name": user.last_name, 
					"id": user.id
				}
				
				doc.dates = { "created": Utils.dateToTimestamp(new Date()) };  
										
				doc.$save({ "format": "documents", "type": "media", "id": "new" }, function(doc, response) {
					var toasterMessage; 
					
					if (response("X-Clear-updatedDocument")==="success") toasterMessage = "Document uploaded";
					else if (response("X-Clear-updatedDocument")==="warning") toasterMessage = "Document did not upload";
					else if (response("X-Clear-updatedDocument")==="error") toasterMessage = "Document did not upload";
					
					if (response("X-Clear-updatedDocument")) toaster.pop(response("X-Clear-updatedDocument"), toasterMessage, doc.name);
					console.log("success");
					$route.reload();
				}, function() {
					console.log("error");
					toaster.pop("error", "Nothing uploaded");
				});
			}
		}
	}])
	
	.factory('ChartsConfig', function(){
		var colorArrayBrand = ['#FFCC0F', '#C79F25', '#705A11', '#9C863D', '#BCAD74', '#FFE699'],
			colorArrayOrder = ['#FF7F00', '#C96301', '#703700', '#9D6826', '#BC9461', '#FFBF81'],
			colorArrayShipment = ['#7EDF02', '#65AD01', '#366201', '#688F25', '#95B164', '#BFEF81'],
			colorArrayBox = ['#36BFE3', '#3194A7', '#1C554F', '#4F8180', '#82A9A8', '#A0DFF0'],
			colorArrayItem = ['#FF7D9F', '#C66378', '#6F373A', '#9B6865', '#BD9595', '#FFBED0'];
		
		return {
			colors: { 
				brand: function() {
					return function(d, i) {
						return colorArrayBrand[i];
					};
				},
				order: function() {
					return function(d, i) {
						return colorArrayOrder[i];
					};
				},
				shipment: function() {
					return function(d, i) {
						return colorArrayShipment[i];
					};
				},
				box: function() {
					return function(d, i) {
						return colorArrayBox[i];
					};
				},
				item: function() {
					return function(d, i) {
						return colorArrayItem[i];
					};
				}
			}, 
			tooltips: {
				pieChart: function(){
					return function(key, x, y, e, graph) {
						return  '<p><strong>' + key + '</strong></p>' + '<p>' + x + '</p>'
					}
				},
				hBarChart: function(){
					return function(key, x, y, e, graph) {
						return  '<p><strong>' + key + '</strong></p>' + '<p>' +  y + '</p>'
					}
				},
				vBarChart: function(){
					return function(key, x, y, e, graph) {
						return  '<p><strong>' + x + ', ' + key + '</strong></p>' + '<p>' +  y + '</p>'
					}
				}, 
				lineChart: function(){
					return function(key, x, y, e, graph) {
				    	return  '<p><strong>' + key + '</strong></p>' + '<p>' +  y + '</p>'
					}
				}
			}, 
			chartFn: function (datas) {
				datas.xFunction = function(){
					return function(d) {
						return d.key;
					};
				}
				datas.yFunction = function(){
					return function(d) {
						return d.value;
					};
				}
				datas.descriptionFunction = function(){
					return function(d){
						return d.key;
					}
				}
			}
		}
	})
	;