const jetpack = require('fs-jetpack');
const gitP = require('simple-git/promise');
const _git = require('simple-git')
import merge from 'deepmerge';
import GitStoreModule from './GitStoreModule'

export default {
	options : {},
	key : null,
	repo : null,
	root_path : null,

	install(options){
		this.options = this.options || {};
		this.key = options.key || null; //'entities';//this is the vuex-orm default keys
		this.repo = options.repo || 'data';
		this.root_path = options.root_path || 'gitstoreData/';

		if (this.repo){
			if(!jetpack.exists(this.root_path + this.repo)){
				this.checkRepo(this.repo);
			}
		}
		
		var g = this;
	    return function(store) {
	    	store.registerModule('gitstore', 
			  	GitStoreModule
			)

	    	var savedState = {};
	    	var currentState = g.key ? store.state[g.key] : store.state;
	    	console.log(currentState);
	    	//only update the state for items we have files for. 
	    	for (var k in currentState){
	    		if (k.indexOf('$') == -1){
	    			var repo = g.whichRepo(currentState[k], currentState)
    				var obj = g.getObject(k, currentState[k].repo != null ? currentState[k].repo : g.repo);
    				console.log(repo, obj)
	    			if (obj != null){
	    				savedState[k] = obj;
	    			}
	    		}
	    	}
	    	var new_state = savedState

	    	if (g.key){
	    		new_state = {}
	    		new_state[g.key] = savedState
	    	}

		    store.replaceState(merge(store.state, new_state, {
		        clone: false,
			}));
		    store.subscribe(function(mutation, state) {
		    	//if we have a key we are looking under use that... probably gonna cause an issue with deeply nested data.
		    	if(g.key != null){
		    		var key = mutation.payload.entity;
		    		var key_state = state[g.key][mutation.payload.entity];
		    		var repo = g.whichRepo(state[g.key][mutation.payload.entity], state);
		    	}else{
		    		var key = null;
		    		if (mutation.type.indexOf('/')){
		    			//this is a module mutation, grab the data from that namespace.
		    			var key = mutation.type.split('/')[0];
		    			key_state = state[key]
		    		}else{
		    			//don't have a key, grab the data from the root of state.
		    			key = mutation.payload.entity;
		    			key_state = state[key];
		    		}
		    		repo = g.whichRepo({}, state);
		    	}
		    	console.log(key, key_state)
		    	if (typeof key_state != 'undefined' && (typeof key_state.persist == 'undefined' || key_state.persist === true) ){
		    		g.setObject(key, key_state, repo);
		    	}
		  	})
	    }
	},

	whichRepo(object, state){
		if (typeof object != 'undefined' && typeof object.repo != 'undefined' && object.repo != null){
			return object.repo;
		}
		if (typeof state.gitStore != 'undefined' && state.gitStore != null){
			if (typeof state.gitstore.repo != 'undefined' && state.gitstore.repo != null){
				return state.gitstore.repo;
			}
		}
		return this.repo;
	},

	checkRepo(repo){
		if (repo){
			if(!jetpack.exists(this.root_path + repo)){
				this.initRepo(repo);
			}
		}
	},

	/*
	Maybe add a readme for this repo for the initial commit
	*/
	initRepo(repo){
		jetpack.dir(this.root_path + repo);
		jetpack.write(this.root_path + repo + '/README.md', "A Vuex-GitStore Data Repository. https://github.com/khphillips/vuex-gitstore")
		_git(this.root_path + repo)
			.init()
			.add('./*')
			.commit("First commit! Initializing Data")
	},

	getObject(key, repo){
		if (this.repo){
			this.checkRepo(repo);
			var path = this.root_path + this.repo + '/' + key + '.json';
		}else{
			path = this.root_path + key + '.json';
		}
		console.log(path)
		var str = jetpack.read(path);
		if (typeof str == 'undefined'){
			return null
		}
        return JSON.parse(str);
	},

    setObject(key, value, repo) {
        value = JSON.stringify(value, null, 2);
        var g = this
        if (this.repo){
        	this.checkRepo(repo);
        	jetpack.writeAsync(this.root_path + repo + "/" + key + '.json', value)
        	this.commitObjects(key, repo);
        }else{
        	jetpack.writeAsync(this.root_path + key + '.json', value)
        }
    },


    commitObjects(key, repo){
    	var g = _git(this.root_path + repo)
        		.addConfig('user.name', 'DarkNote')
    			.addConfig('user.email', 'some@one.com')
    			.add(key + '.json')
       			.commit("Data update: " + key);
    }
    
}