class AddRankToUser < ActiveRecord::Migration
    def change
        add_column :users, :rank, :decimal, default: 0, precision: 5, scale: 2
    end
end
