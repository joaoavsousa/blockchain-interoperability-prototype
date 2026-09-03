// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Asset {
    mapping(uint256 => mapping(address => uint256)) public balances;

    event Minted(
	uint256 indexed assetId,
	address indexed to,
	uint256 amount
    );

    event Burned(
	uint256 indexed assetId,
	address indexed from,
	uint256 amount
    );

    function mint(uint256 assetId, address to, uint256 amount) external {

	require(amount > 0, "amount must be positive");

        balances[assetId][to] += amount;
        emit Minted(assetId, to, amount);
    }

    function burn(uint256 assetId, address from, uint256 amount) external {
        require(amount > 0, "amount must be positive");
	require(balances[assetId][from] >= amount, "insufficient asset balance");
        balances[assetId][from] -= amount;
        emit Burned(assetId, from, amount);
    }

    function balanceOf(uint256 assetId, address owner) external view returns (uint256) {
        return balances[assetId][owner];
    }
}
