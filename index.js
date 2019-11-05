const jetpack = require('fs-jetpack');
const gitP = require('simple-git/promise');
const _git = require('simple-git')
import merge from 'deepmerge';

export default {
	options : {},
	key : null, // default to vuex-orm key
	repo : null,
	root_path : null,

	install(options){
		this.options = this.options || {};
		//storage = options.storage || (window && window.localStorage);
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
	    	var savedState = {};
	    	var currentState = g.key ? store.state[g.key] : store.state;
	    	//only update the state for items we have files for. 
	    	for (var k in currentState){
	    		if (k.indexOf('$') == -1){
	    			var repo = g.whichRepo(currentState[k], currentState)
    				var obj = g.getObject(k, currentState[k].repo != null ? currentState[k].repo : g.repo);
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

		    store.replaceState(merge(new_state, store.state, {
		        clone: false,
			}));
		    store.subscribe(function(mutation, state) {
		    	//if we have a key we are looking under use that... probably gonna cause an issue with deeply nested data.
		    	if(g.key != null){
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
		    	if (typeof key_state.persist == 'undefined' || key_state.persist === true){
		    		g.setObject(key, key_state, repo);
		    	}
		  	})
	    }
	},

	whichRepo(object, state){
		if (typeof object.repo != 'undefined' && object.repo != null){
			return object.repo;
		}
		if (typeof state.gitStore != 'undefined' && state.gitStore != null){
			if (typeof state.gitStore.repo != 'undefined' && state.gitStore.repo != null){
				return state.gitStore.repo;
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
			var str = jetpack.read(this.root_path + this.repo + '/' + key + '.json');
		}else{
			var str = jetpack.read(this.root_path + key + '.json');
		}
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