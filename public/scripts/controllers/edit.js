angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', '$timeout', '$q'];

function EditCtrl ($scope, pGraph, $timeout, $q) {
  var vm = this;
  vm.selected = null;
  vm.variable = null;
  vm.data = [];

  vm.isVariable = true;
  vm.isConst    = false;
  vm.isLiteral  = false;

  vm.newValueType = '';
  vm.newValuePlaceholder = '';
  vm.newValue = '';

  vm.resultFilterValue = '';
  vm.resultFilterLoading = false;
  vm.canceller = null;

  vm.added  = 0;
  vm.newFilterType = "";
  vm.newFilterData = {};
  vm.showFilters = true;

  vm.mkVariable = mkVariable;
  vm.mkConst    = mkConst;
  vm.addValue   = addValue;
  vm.rmValue    = rmValue;
  vm.newFilter  = newFilter;
  vm.rmFilter   = rmFilter;
  vm.loadPreview  = loadPreview;
  vm.addSearchAsFilter = addSearchAsFilter;

  pGraph.edit = editResource;
  vm.refresh  = pGraph.refresh;
  vm.filters  = pGraph.filters;

  // Paginação
  vm.itemInitial = 1;
  vm.itemFinal = 20;
  vm.currentPagination = 1;
  vm.totalPagination = [];

  function editResource (resource) {
    if (vm.selected != resource) {
      vm.resultFilterValue = '';
    }
    if (resource) {
      vm.selected   = resource;
      vm.variable   = resource.variable;
      vm.variable.results = vm.variable.results.sort((a, b) => a.value.localeCompare(b.value));
      vm.isVariable = resource.isVariable();
      vm.isConst    = !vm.isVariable;
      vm.isLiteral  = !!(vm.selected.parent); //FIXME: check if this is a literal

      if (vm.isLiteral) {
        vm.newValueType = 'text';
        vm.newValuePlaceholder = 'add a new literal';
      } else {
        vm.newValueType = 'url';
        vm.newValuePlaceholder = 'add a new URI';
      }

      loadPreview();
    }
    $scope.$emit('tool', 'edit');
  }

  function mkVariable () {
    vm.selected.mkVariable();
    vm.isVariable = true;
    vm.isConst = false;
    loadPreview();
    vm.refresh();
  }

  function mkConst () {
    vm.added = 0;
    vm.selected.mkConst();
    vm.isVariable = false;
    vm.isConst = true;
    vm.refresh();
  }

  function addValue (newV) {
    if (!newV) {
      newV = vm.newValue;
      vm.newValue = '';
    }
    if (newV && vm.selected.addUri(newV)) {
      if (vm.selected.uris.length == 1) {
        mkConst();
      } else {
        vm.added += 1
      }
      vm.refresh();
    }
  }

  function rmValue (value) {
    return vm.selected.removeUri(value)
  }

  function newFilter (targetVar) { //TODO: targetVar not needed now
    if (vm.newFilterType == "") return false;
    targetVar.addFilter(vm.newFilterType, copyObj(vm.newFilterData));
    loadPreview();
    vm.refresh();
    vm.newFilterType = "";
    vm.newFilterData = {};
  }

  function rmFilter (targetVar, filter) {
    targetVar.removeFilter(filter);
    loadPreview();
  }

  var lastValueSearch = '';
  function loadPreview () {
    if (!vm.isVariable) return;

    if (vm.canceller) {
      vm.canceller.resolve('new preview');
      vm.resultFilterLoading = false;
    }
    
    vm.canceller = $q.defer();
    vm.resultFilterLoading = true;
    var config = { //add pagination here
      //limit: 10,
      callback: () => { 
        vm.resultFilterLoading = false;
        vm.canceller = null; 
        vm.dataPagination();
      },
      canceller: vm.canceller.promise,
    };

    var now = vm.resultFilterValue + '';
    if (now) {
      $timeout(function () {
        if (now == vm.resultFilterValue && now != lastValueSearch) {
          lastValueSearch = now;
          vm.resultFilterLoading = true;
          config.varFilter = now;
          vm.selected.loadPreview(config);
        }
      }, 400);
    } else {
      lastValueSearch = '';
      vm.selected.loadPreview(config);
    }
  }

  function addSearchAsFilter () { // should work but not used
    var text = vm.resultFilterValue + '';
    
    var p = vm.selected.getPropByUri("http://www.w3.org/2000/01/rdf-schema#label");
    if (!p) {
      p = vm.selected.newProp();
      p.addUri('http://www.w3.org/2000/01/rdf-schema#label');
    }
    p.mkConst();
    p.mkLiteral();
    p.getLiteral.addFilter('regex', {regex: text});
    loadPreview();
  }

  function copyObj (obj) {
    return Object.assign({}, obj);
  }

  // Métodos de paginação
  vm.dataPagination = function ( ) {
    if( !vm.variable.results ) return;

    let begin = vm.itemInitial - 1;
    let end = vm.itemFinal - 1;  

    let count = Math.ceil(vm.variable.results.length/20);
    if ( count > 0 ) {
      vm.totalPagination = Array(count).fill(null).map((_, i) => i+1);
    }
    
    vm.data = vm.variable.results
                .sort((a, b) => a.value.localeCompare(b.value))
                .slice(begin, end);
  }

  vm.updatePrevious = function () {
    if ( vm.currentPagination === 1 ) return;
    
    vm.currentPagination -= 1;
    vm.itemInitial -= 20;
    vm.itemFinal -= 20;

    vm.data = vm.variable.results
                .sort((a, b) => a.value.localeCompare(b.value))
                .slice(vm.itemInitial-1, vm.itemFinal-1);
  }

  vm.updateNext = function () {
    if ( vm.currentPagination === vm.totalPagination ) return;
    
    vm.currentPagination += 1;
    vm.itemInitial += 20;
    vm.itemFinal += 20;

    vm.data = vm.variable.results
                .sort((a, b) => a.value.localeCompare(b.value))
                .slice(vm.itemInitial-1, vm.itemFinal-1);
  }

  vm.updateIndex = function ( indexPage ) {
    vm.currentPagination = indexPage;

    vm.itemInitial = 1 + (20 * (indexPage-1));
    vm.itemFinal = 20 + (20 * (indexPage-1));

    vm.data = vm.variable.results
                .sort((a, b) => a.value.localeCompare(b.value))
                .slice(vm.itemInitial-1, vm.itemFinal-1);
  }

}
