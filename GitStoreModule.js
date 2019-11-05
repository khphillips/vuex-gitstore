export default {
	namespaced: true,
    state: {
        username: null,
        email: null,
        password: null,
        persist: false,
    },
    mutations: {
    	commitUser (state, user){
    		if (typeof user.username != 'undefined'){
    			state.username = user.username;
    		}
    		if (typeof user.email != 'undefined'){
    			state.email = user.email;
    		}
    		if (typeof user.password != 'undefined'){
    			state.password = user.password;
    		}
    	}
    },
    actions: {
    	setUser : ({commit}, payload) =>{
    		commit('commitUser', payload);
    	}
    },
    getters: {}
}